#!/bin/bash

# Purpose: To package a .js file that you have on GitHub
# for use in your website via CDN (i.e. production use),
# run this command: bash package.sh

# More info on SemVer: https://semver.org

LIBRARY_NAME=trysterollup
SOURCE_FILE=trysterollup.js
MINIFIED_FILE=trysterollup.min.js

# install minify if it's not available:
if ! [ -x "$(command -v minify)" ]; then npm i minify; fi
# minify the code:
minify $SOURCE_FILE > $MINIFIED_FILE

# # get latest release number #.#.#:
# git pull >/dev/null 2>&1 # (update just in case)
# LATEST_RELEASE_VERSION="$(git describe --tags --abbrev=0)"
# IFS='.' # delimiter
# read -a VERSION_NUMBERS <<< "$LATEST_RELEASE_VERSION"
# MAJOR=${VERSION_NUMBERS[0]}
# MINOR=${VERSION_NUMBERS[1]}
# PATCH=${VERSION_NUMBERS[2]}

# echo
# echo "Enter a number:"
# echo
# echo " 0 = Keep as version ${LATEST_RELEASE_VERSION}"
# echo " 1 = Major breaking change? ($(($MAJOR+1)).0.0)"
# echo " 2 = Minor enhancement? ($MAJOR.$(($MINOR+1)).0)"
# echo " 3 = Backwards-compatible fix? ($MAJOR.$MINOR.$(($PATCH+1)))"
# echo
# read -p "(Choose 1/2/3): " -n 1 -r
# echo
# echo
# if [[ $REPLY =~ ^1$ ]]; then
#   echo "Changing MAJOR version:"
#   MAJOR="$(($MAJOR+1))"
#   MINOR=0
#   PATCH=0
# elif [[ $REPLY =~ ^2$ ]]; then
#   echo "Changing MINOR version:"
#   MINOR="$(($MINOR+1))"
#   PATCH=0
# elif [[ $REPLY =~ ^3$ ]]; then
#   echo "Changing PATCH version:"
#   PATCH="$(($PATCH+1))"
# elif [[ $REPLY =~ ^[qQxXnN]$ ]]; then
#   echo "Exiting."
#   exit 1
# else
#   echo "Keeping as version ${LATEST_RELEASE_VERSION}"
# fi

# echo
# echo "${LIBRARY_NAME} ${MAJOR}.${MINOR}.${PATCH} minified"
# echo

# # add version number to top of file:
# sed -i '' '1i\
# '//\ $LIBRARY_NAME\ ${MAJOR}.${MINOR}.${PATCH}'
# ' "${MINIFIED_FILE}"
# # NOTE: the in-place parameter '' is required for Mac

# print out hash for use in integrity attribute:
echo
echo Minified: $SOURCE_FILE -\> $MINIFIED_FILE
echo Hash: sha384-$(cat "${MINIFIED_FILE}" | openssl dgst -sha384 -binary | openssl base64 -A)
echo REMINDER: Make sure to update the semver version in package.json
echo