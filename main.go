package main

import (
	"flag"
	"github.com/kataras/golog"
	"github.com/kataras/iris/v12"
	"github.com/kataras/iris/v12/middleware/logger"
	recover2 "github.com/kataras/iris/v12/middleware/recover"
	"log"
	//"iris"
	//"log"
)

var (
	flagConfigPath *string
)

func flags() {
	flagConfigPath = flag.String("config", "config.toml", "config file path")

	flag.Parse()
}

func main() {
	flags()

	initConfig(*flagConfigPath)

	app := iris.New()

	app.Logger().Level = golog.DebugLevel
	app.Use(logger.New(), recover2.New())
	//app.UseGlobal(func(ctx context.Context) {
	//	ctx.Header("Access-Control-Allow-Origin", "*")
	//	ctx.Header("Access-Control-Allow-Headers", "Content-Type")
	//	ctx.Next()
	//})

	initHandler(app)

	app.HandleDir("", "./assets/control_panel")

	if err := app.Run(iris.Addr(":8080")); err != nil {
		log.Fatalln(err)
	}

	//if err := http.ListenAndServe("localhost:8080", http.FileServer(http.Dir("./control_panel"))); err != nil {
	//	fmt.Println(err)
	//}
}
