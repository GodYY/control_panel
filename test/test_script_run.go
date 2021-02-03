package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
)

func main() {
	if len(os.Args) < 2 {
		log.Fatalf("usage: %s scrip_file_name.", os.Args)
	}

	data := map[string]interface{}{
		"op": 3,
	}

	bs, _ := json.Marshal(data)

	resp, _ := http.Post("http://localhost:8080/script/"+os.Args[1],
		"application/json; charset=utf-8",
		bytes.NewBuffer(bs))
	buffer := make([]byte, 1024)
	for {
		n, err := resp.Body.Read(buffer)
		if n > 0 {
			fmt.Println(string(buffer[:n]))
		}
		if n == 0 || err != nil {
			break
		}
	}

}
