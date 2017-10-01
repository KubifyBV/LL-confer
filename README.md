# Confer

Confer is a tool to support collaborative learning in professional settings. The tool is developed 
through an innovative process, which combines inputs from theory with analysis of current practice 
and user feedback on proposed innovation. It guides and supports groups of practitioners through a 
process of progressive inquiry.

## Getting Started

To get you started you can simply clone the repository and install the dependencies as written below.

### Prerequisites

We also use a number of node.js tools to initialize and test angular-seed. You must have node.js and
its package manager (npm) installed.  You can get them from [http://nodejs.org/](http://nodejs.org/).

### Install Dependencies

We have two kinds of dependencies in this project: tools and angular framework code.  The tools help
us manage and test the application.

* We get the tools we depend upon via `npm`, the [node package manager][npm].
* We get the angular code via `bower`, a [client-side code package manager][bower].

We have preconfigured `npm` to automatically run `bower` so we can simply do:

```
npm install
```

Behind the scenes this will also call `bower install`.  You should find that you have two new
folders in your project.

* `node_modules` - contains the npm packages for the tools we need
* `app/bower_components` - contains the angular framework files

*Note that the `bower_components` folder would normally be installed in the root folder but
angular-seed changes this location through the `.bowerrc` file.  Putting it in the app folder makes
it easier to serve the files by a webserver.*

*If you have bower update issues the following may be the case:
The problem was that bower tried to retrieve packages through git:// protocol, which seems to be blocked at my machine.
git config --global url."https://".insteadOf git:// solved the problem.

## translations

For i18n we useangular-gettext. Follow these steps to update language files.
See: https://angular-gettext.rocketeer.be/dev-guide 

### extract translation string to .pot file

* Run 'grunt nggettext-extract' to update po/language.pot

### translate strings

* use poedit
* new languages: use "new catalog from POT file"
* existing languages: open <lang>.po in poedit, use "update from POT file"
* save <lang>.po

### compile translations

* run 'grunt nggettext-compile' to generate app/languages/<lang>.json files
