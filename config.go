package main

import (
	"fmt"
	"github.com/BurntSushi/toml"
	"log"
)

type config struct {
	ScriptPath string `toml:"ScriptPath"`
}

var gConfig *config

func initConfig(filepath string) {
	gConfig = new(config)

	if _, err := toml.DecodeFile(filepath, gConfig); err != nil {
		log.Fatalln(fmt.Sprintf("load config: %s.", err))
	}

	log.Println(*gConfig)
}
