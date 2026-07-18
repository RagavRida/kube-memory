brew install prometheus

```
global:
	scrape_interval: 15s

scrape_configs:
	- job_name: "prometheus"
	static_configs:
		- targets: ["localhost:9090"]
```

prometheus --version

which prometheus - output (/opt/homebrew/etc/prometheus.yml)

run command - 

prometheus --config.file=/opt/homebrew/etc/prometheus.yml

