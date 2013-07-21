#!/bin/bash
# Usage cat mail.txt | put.sh
# Mutt macro:
# macro index,pager ,p <pipe-message>'put.sh<enter>'

TMP=`tempfile`
cat < /dev/stdin > $TMP
exec 0</dev/tty
put.js -i -f $TMP
rm $TMP
