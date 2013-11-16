default: help

help:
	@echo "help   - display this text"
	@echo "all    - merge js libraries"

all: build

.PHONY: build

build: 
	cat lib/remotestorage.js lib/webL10n/l10n.js lib/htmlparser.js js/touch.js > lib/build.js
	cat css/alir.css css/font.css css/widgetCss.css > css/build.css
	echo "0.1."`git ls | wc -l` > VERSION

