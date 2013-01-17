# Grind — Compile your caffienated languages.

Grind is a JavaScript/CoffeeScript build tool created by [Paul Straw](http://paulstraw.com). To use it, just specify a `Grindfile` at the root of your project using JSON; something like this:

``` javascript
{
	"paths": [
		"src/firstFile.js",
		"src/secondFile.coffee",
		"src/someFolder",
		"src/somethingElse.coffee"
	],
	"out": "grind-out.js",
	"uglify": true,
	"hint": true,
	"before": "",
	"after": ""
}
```

It will optionally [hint](https://github.com/jshint/jshint/) and [uglify](https://github.com/mishoo/UglifyJS2) your files, then write the result to whatever file you specify (default `grind-out.js`). If you have any other commands to run, just specify them in `before` or `after`.


## Installation

Installation is handled with [NPM](http://npmjs.org/). Just type `npm install grind -g` and you should be good to go.


## Why didn't you just use _OtherTool_ instead of making this?

* I'm picky, and nothing I've found handles JS/CS compilation like I want it to.
* It had been too long since I seriously played with Node (Over a year, disgraceful).
* I needed a nice way to compile my new game engine, [Cider](https://github.com/paulstraw/cider).


## License

Grind is licensed under the MIT license. For details, see the COPYING file.