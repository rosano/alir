default: help

help:
	@echo "help   - display this text"
	@echo "build  - merge js libraries"
	@echo "zip    - create packaged app"
	@echo "all    - build + zip"
	@echo "test   - run tests"

all: build zip

.PHONY: build zip tests

build: 
	uglifyjs 	lib/polyfill.js \
						lib/remotestorage.js \
						lib/webL10n/l10n.js \
						lib/htmlparser.js \
						lib/showdown.js \
						js/touch.js js/utils.js \
						addon/data/lib/readabilitySAX/DOMasSAX.js \
						addon/data/lib/readabilitySAX/readabilitySAX.js \
						js/scrap.js \
						-o lib/build.js \
						--source-map build.js.map --source-map-url /build.js.map --screw-ie8
	cat css/alir.css css/form.css css/font.css css/widgetCss.css > css/build.css
	echo "0.1."`git ls | wc -l` > VERSION

zip:
	rm -f alir.zip
	zip -r alir.zip index.html img js lib/build.js locales manifest.webapp

tests:
	xvfb-run casperjs --engine=slimerjs test tests/suites/
