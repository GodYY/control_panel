package main

import (
	"fmt"
	"github.com/kataras/golog"
	"github.com/kataras/iris/v12"
	"github.com/kataras/iris/v12/context"
	"io/ioutil"
	"os"
	"os/exec"
	"path"
	"path/filepath"
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
				if f, err := os.OpenFile(path.Join(gConfig.ScriptPath, file), os.O_RDWR|os.O_CREATE|os.O_EXCL, 0700); err != nil {
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
				if f, err := os.OpenFile(path.Join(gConfig.ScriptPath, file), os.O_RDWR|os.O_CREATE|os.O_TRUNC, 0777); err != nil {
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

			if bytes, err := exec.Command("sh", "-c", "pwd").Output(); err == nil {
				ctx.Application().Logger().Debug(string(bytes))
			} else {
				ctx.Application().Logger().Debug(err)
			}

			cmd := exec.Command("sh", path.Join(gConfig.ScriptPath, file))
			bytes, err := cmd.CombinedOutput()

			if err != nil {
				result[fCode] = 1
				result[fDetail] = err.Error()
			} else {
				result[fCode] = 0
				result[fDetail] = "ok"
			}

			result["output"] = string(bytes)

		default:
			result["code"] = 1
			result["detail"] = "invalid op"
		}

	}

	_, _ = ctx.JSON(result)
}

func initHandler(app *iris.Application) {
	app.Get("/processes", onProcessesGet)

	app.Get("/script", onScriptGet)

	app.Get("/script/{file:string}", onScriptFileGet)

	app.Post("/script/{file:string}", onScriptFileOp)
}
