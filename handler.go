package main

import (
	"bufio"
	"fmt"
	"github.com/kataras/golog"
	"github.com/kataras/iris/v12"
	"github.com/kataras/iris/v12/context"
	"io/ioutil"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"strings"
)

func onProcessesGet(ctx context.Context) {
	key := ctx.URLParam("key")

	cmd := "ps"
	if len(key) > 0 {
		cmd += fmt.Sprintf(" | grep -E \"%s|PID\" | grep -v grep", key)
	}

	if bytes, err := exec.Command("sh", "-c", cmd).Output(); err != nil {
		err := err.(*exec.ExitError)
		if err.ExitCode() == 1 {
			ctx.WriteString("")
		} else {
			ctx.WriteString(err.Error())
		}
	} else {
		ctx.WriteString(string(bytes))
	}
}

func onProcessesStop(ctx context.Context) {
	var data struct {
		ID     string `json:"id"`
		Signal string `json:"signal"`
	}

	if err := ctx.ReadJSON(&data); err != nil {
		ctx.Problem(err)
		return
	}

	var result struct {
		Code   int    `json:"code"`
		Detail string `json:"detail"`
	}

	defer ctx.JSON(&result)

	if len(data.ID) == 0 {
		result.Code = 1
		result.Detail = "invalid id"
		return
	}

	var signal string
	switch strings.ToLower(data.Signal) {
	case "interrupt":
		signal = "-INT"

	case "kill":
		signal = "-KILL"

	case "terminate":
		signal = "-TERM"

	default:
		result.Code = 1
		result.Detail = "invalid signal"
		return
	}

	cmd := exec.Command("kill", signal, data.ID)
	if bytes, err := cmd.CombinedOutput(); err != nil {
		result.Code = 1
		if (len(bytes)) > 0 {
			result.Detail = fmt.Sprintf("%s. %s.", string(bytes), err)
		} else {
			result.Detail = err.Error()
		}
	} else {
		result.Code = 0
		result.Detail = "ok"
	}
}

func onScriptGet(ctx context.Context) {
	result := map[string]interface{}{}

	scripts := make([]string, 0)

	if err := filepath.Walk(gConfig.ScriptPath, func(path string, info os.FileInfo, err error) error {

		if err != nil {
			return err
		}

		if info.IsDir() {
			return nil
		}

		scripts = append(scripts, info.Name())
		return nil

	}); err != nil {
		result["code"] = 1
		result["detail"] = err.Error()
	} else {
		result["code"] = 0
		result["detail"] = "ok"
		result["scripts"] = scripts
	}

	_, err := ctx.JSON(result)
	ctx.Application().Logger().Log(golog.DebugLevel, err)
}

func onScriptFileGet(ctx context.Context) {
	file := ctx.Params().Get("file")

	file = path.Join(gConfig.ScriptPath, file)

	result := map[string]interface{}{}

	if f, err := os.Open(file); err != nil {

		result["code"] = 1
		result["detail"] = err.Error()

	} else if bytes, err := ioutil.ReadAll(f); err != nil {

		result["code"] = 1
		result["detail"] = err.Error()

	} else {

		result["code"] = 0
		result["detail"] = "ok"

		result["content"] = string(bytes)
	}

	ctx.JSON(result)
}

func onScriptFileOp(ctx context.Context) {
	//time.Sleep(5 * time.Second)

	fCode := "code"
	fDetail := "detail"

	file := ctx.Params().Get("file")
	var data struct {
		Op      int    `json:"op"`
		Content string `json:"content"`
	}
	result := map[string]interface{}{}

	if err := ctx.ReadJSON(&data); err != nil {
		result[fCode] = 1
		result[fDetail] = fmt.Sprintf("read body: %s", err.Error())
	} else {

		switch data.Op {
		case 0:
			// 新建
			if len(data.Content) == 0 {
				result[fCode] = 1
				result[fDetail] = "no content"
			} else {
				if f, err := os.OpenFile(path.Join(gConfig.ScriptPath, file), os.O_RDWR|os.O_CREATE|os.O_EXCL, os.ModePerm); err != nil {
					result[fCode] = 1
					if os.IsExist(err) {
						result[fDetail] = "script exist"
					} else {
						result[fDetail] = err.Error()
					}
				} else if _, err := f.WriteString(data.Content); err != nil {
					result[fCode] = 1
					result[fDetail] = err.Error()
				} else {
					result[fCode] = 0
					result[fDetail] = "ok"
					f.Close()
				}
			}

		case 1:
			// 更新
			if len(data.Content) == 0 {
				result[fCode] = 1
				result[fDetail] = "no content"
			} else {
				if f, err := os.OpenFile(path.Join(gConfig.ScriptPath, file), os.O_RDWR|os.O_CREATE|os.O_TRUNC, os.ModePerm); err != nil {
					result[fCode] = 1
					result[fDetail] = err.Error()
				} else if _, err = f.WriteString(data.Content); err != nil {
					result[fCode] = 1
					result[fDetail] = err.Error()
				} else {
					result[fCode] = 0
					result[fDetail] = "ok"
					f.Close()
				}

			}

		case 2:
			// 删除
			if err := os.Remove(path.Join(gConfig.ScriptPath, file)); err != nil {
				result[fCode] = 1
				result[fDetail] = err.Error()
			} else {
				result[fCode] = 0
				result[fDetail] = "ok"
			}

		case 3:
			// 执行
			ctx.ContentType("text/plain")
			ctx.Header("Transfer-Encoding", "chunked")

			notifyClose := ctx.Request().Context().Done()

			cmd := exec.Command("sh", "-xe", path.Join(gConfig.ScriptPath, file))

			r, w, err := os.Pipe()
			if err != nil {
				ctx.Writef("open pipe: %s.", err.Error())
				return
			}

			cmd.Stdout = w
			cmd.Stderr = w

			if err = cmd.Start(); err != nil {
				ctx.Writef("start: %s.", err.Error())
				return
			}

			go func() {
				err = cmd.Wait()
				w.Close()
			}()

			scanner := bufio.NewScanner(r)
			scan := true
			for scan {
				select {
				case <-notifyClose:
					scan = false

				default:
					if !scanner.Scan() {
						scan = false
						break
					}
					s := scanner.Text()
					ctx.Writef("%s\n", s)
					ctx.ResponseWriter().Flush()
					//time.Sleep(time.Second * 1)
				}
			}

			r.Close()
			if err != nil {
				ctx.WriteString(err.Error())
			}
			return

		default:
			result["code"] = 1
			result["detail"] = "invalid op"
		}

	}

	_, _ = ctx.JSON(result)
}

func initHandler(app *iris.Application) {
	app.Get("/processes", onProcessesGet)

	app.Post("/processes/stop", onProcessesStop)

	app.Get("/script", onScriptGet)

	app.Get("/script/{file:string}", onScriptFileGet)

	app.Post("/script/{file:string}", onScriptFileOp)
}
