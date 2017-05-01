'use babel';
/* @flow */
import url  from 'url'
import path from 'path'
import { Range, File } from 'atom'

export const isSoy = (textEditor) => {
    const { scopeName } = textEditor.getGrammar()
    return ( scopeName === 'text.html.soy' )
}

function isFunction( textEditor, range ) {

  let line = textEditor.buffer.lineForRow( range.start.row );

  // match template calls, not template definitions
  // var matches = line.match(/\{\/?(?:call|delcall)(?:\\s+([\\.\\w]+))?/g);

  let matches = []
  r = /\{(?:call|delcall)\s+([\.\w]+)/g
  while ((matchArr = r.exec(line)) !== null) {
    matches.push(matchArr[1])
    // var msg = 'Found ' + myArray[0] + '. ';
    // msg += 'Next match starts at ' + myRe.lastIndex;
    // console.log(msg);
  }

  // if no match bail out
  if ( matches == null)
    return false;

  // multiple variables on same line give multiple matches, so find the
  // right one to jump to
  for (var i = 0; i < matches.length; i++) {

    var varStart = line.indexOf( matches[i] );

    if ( varStart                     <= range.start.column &&
         varStart + matches[i].length >= range.end.column ) {
        return {
          name: matches[i].substring( 0, matches[i].length ),
          underlineRange: new Range( [ range.start.row, varStart ],
                                     [ range.end.row,   varStart + matches[i].length ])
          };
        }

  }

  return false;

}

function currentNamespace(textEditor) {
    line = textEditor.buffer.lineForRow( 0 );
    r = /\{namespace\s+([\w\.]+)/;
    res = r.exec(line)
    if (res !== null) {
      return res[1]
    }
    return null
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrollToTemplateInEditor(textEditor, name ) {
    console.log("scrolling in current to: ", name);
    var line;
    var n = textEditor.getLineCount()
    var m;
    var re = new RegExp( '\{\/?template\\s+' + name);

    while ( n-- > 0 ) {
      line = textEditor.buffer.lineForRow( n );
      console.log(n + ": ", line);

      if ( m = line.match( re ) )
        break;
    }

    if ( m == null || n == -1 )
      return;

    textEditor.setCursorBufferPosition([n, line.indexOf( name )]);
    textEditor.scrollToCursorPosition()
}

function jumpToTemplateDefn( textEditor, name, range, cache ) {
  if (name.charAt(0) === '.') {
    let ns = currentNamespace(textEditor);
    var line;
    console.log(name)
    // var n = range.start.row;
    var n = textEditor.getLineCount()
    var m;
    var re = new RegExp( '\{\/?template\\s+' + name);

    while ( n-- > 0 ) {
      line = textEditor.buffer.lineForRow( n );

      if ( m = line.match( re ) )
        break;
    }

    if ( m == null || n == -1 )
      return;

    textEditor.setCursorBufferPosition([n, line.indexOf( name )]);
    textEditor.scrollToCursorPosition()
  } else {
    let parts = name.split(".");
    let ns = parts.slice(0, parts.length-1).join(".");
    templateName = parts[parts.length-1];
    atom.workspace.open(cache[ns][0]).then(function (editor) {
      scrollToTemplateInEditor(editor,  "." + templateName )
    })
  }
}
function scrollToFunctionDefn( textEditor, name, range ) {

  var line;
  console.log(name)
  // var n = range.start.row;
  var n = textEditor.getLineCount()
  var m;
  var re = new RegExp( '\{\/?template\\s+' + name);

  while ( n-- > 0 ) {
    line = textEditor.buffer.lineForRow( n );

    if ( m = line.match( re ) )
      break;
  }

  if ( m == null || n == -1 )
    return;

  textEditor.setCursorBufferPosition([n, line.indexOf( name )]);
  textEditor.scrollToCursorPosition()

}

function scrollToVarDefn( textEditor, varname, range ) {

  var line;
  var n = range.start.row;
  var m;
  // var re = new RegExp( "\\" + varname + "\s*[^=]?=" );
  var re = new RegExp( '\{\/?let\\s+' + name);

  // post-decrement to start looking at line above click
  while ( n-- > 0 ) {
    line = textEditor.buffer.lineForRow( n );

    if ( m = line.match( re ) )
      break;
  }

  if ( m == null || n == -1 )
    return;

  textEditor.setCursorBufferPosition([n, line.indexOf( varname )]);
  textEditor.scrollToCursorPosition()

}

function isVariable( textEditor, range ) {
  var line = textEditor.buffer.lineForRow(range.start.row);

  // can test via console with:
  // atom.workspace.getActiveTextEditor().buffer.lineForRow(11).match(/(require|include)(_once)?.+(['"])(.+)\3/)
  var matches = line.match(/(\$[a-zA-Z0-9_]+)/g);

  if ( matches == null )
    return false;

  // multiple variables on same line give multiple matches, so find the
  // right one to jump to
  for (var i = 0; i < matches.length; i++) {

    var varStart = line.indexOf( matches[i] );

    if ( varStart                     <= range.start.column &&
         varStart + matches[i].length >= range.end.column ) {
        return {
          name: matches[i],
          underlineRange: new Range( [ range.start.row, varStart ],
                                     [ range.end.row,   varStart + matches[i].length ])
          };
        }

  }

  return false;

}

// see https://github.com/facebooknuclideapm/hyperclick for
var singleSuggestionProvider = {
  providerName: "hyperclick-php",
  // wordRegExp: /(['"]).+?\1/,
  getSuggestionForWord(textEditor: TextEditor, text: string, range: Range): HyperclickSuggestion {
    if ( isSoy( textEditor )) {

      t = isVariable( textEditor, range );
      if ( t ) {
        return {
          // The range(s) to underline as a visual cue for clicking.
          range: t.underlineRange,
          // The function to call when the underlined text is clicked.
          callback() {
            scrollToVarDefn( textEditor, t.name, range );
          }
        }
      }

      f = isFunction( textEditor, range );
      if ( f ) {
        return {
          range: f.underlineRange,
          callback() {
            scrollToFunctionDefn( textEditor, f.name, range );
          }
        }
      }
    }
  },
};

function addMapping(map, ns, fn) {
  console.log(ns);
  if ("undefined" === typeof map.ns) {
    map[ns] = [fn];
  } else {
    map[ns].push(fn)
  }
}

function makeCache() {
  nameSpaceMap = {};
  r = /\{namespace\s+([\w\.]+)/;
  ds = atom.project.getDirectories();
  for (var dir of ds) {
    dir.getEntries(function (err, entries) {
      for (var ent of entries) {
        if (ent.isFile()) {
          // atom.workspace.open(ent.getBaseName())
          ent.read().then(function (value) {
            lineEnd = value.indexOf('\n');
            if (lineEnd !== -1) {
              res = r.exec(value.substring(0, lineEnd))
              if (res !== null) {
                addMapping(nameSpaceMap, res[1], ent.getPath());
              }
            }
          })
        }
      }
    })
  }
  console.log(nameSpaceMap);
  return nameSpaceMap;
}

function makeProvider() {
  const cache = makeCache()
  var mySingleSuggestionProvider = {
    providerName: "hyperclick-php",
    // wordRegExp: /(['"]).+?\1/,
    getSuggestionForWord(textEditor: TextEditor, text: string, range: Range): HyperclickSuggestion {
      if ( isSoy( textEditor )) {

        t = isVariable( textEditor, range );
        if ( t ) {
          return {
            // The range(s) to underline as a visual cue for clicking.
            range: t.underlineRange,
            // The function to call when the underlined text is clicked.
            callback() {
              scrollToVarDefn( textEditor, t.name, range );
            }
          }
        }

        f = isFunction( textEditor, range );
        if ( f ) {
          return {
            range: f.underlineRange,
            callback() {
              jumpToTemplateDefn( textEditor, f.name, range, cache);
            }
          }
        }
      }
    },
  };
  return mySingleSuggestionProvider;
}

module.exports = {
  getProvider() {
    // return singleSuggestionProvider;
    return makeProvider();
  },
};
