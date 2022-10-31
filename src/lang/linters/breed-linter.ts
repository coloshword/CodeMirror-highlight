import { syntaxTree } from '@codemirror/language';
import { linter, Diagnostic } from '@codemirror/lint';
import { SyntaxNode } from '@lezer/common';
import { EditorState } from '@codemirror/state';
import { stateExtension } from '../../codemirror/extension-state-netlogo';

// BreedLinter: To check breed commands/reporters for valid breed names
export const BreedLinter = linter((view) => {
  const diagnostics: Diagnostic[] = [];
  const breedNames: string[] = [];
  view.state.field(stateExtension).Breeds.map((breed) => {
    breedNames.push(breed.Singular);
    breedNames.push(breed.Plural);
  });
  syntaxTree(view.state)
    .cursor()
    .iterate((noderef) => {
      if (
        noderef.name == 'BreedFirst' ||
        noderef.name == 'BreedMiddle' ||
        noderef.name == 'BreedLast'
      ) {
        const Node = noderef.node;
        const value = view.state.sliceDoc(noderef.from, noderef.to);
        if (!checkValidBreed(Node, value, view.state, breedNames)) {
          diagnostics.push({
            from: noderef.from,
            to: noderef.to,
            severity: 'error',
            message: 'Unrecognized breed name',
            actions: [
              {
                name: 'Remove',
                apply(view, from, to) {
                  view.dispatch({ changes: { from, to } });
                },
              },
            ],
          });
        }
      }
    });
  return diagnostics;
});

// Checks if the term in the structure of a breed command/reporter is the name
// of an actual breed
const checkValidBreed = function (
  node: SyntaxNode,
  value: string,
  state: EditorState,
  breedNames: string[]
) {
  let isValid = false;
  const values = value.split('-');
  // These are broken up into BreedFirst, BreedMiddle, BreedLast so I know where to
  // check for the breed name. Entirely possible we don't need this and can just search
  // the whole string.
  if (node.name == 'BreedFirst') {
    const val = values[0];
    if (breedNames.includes(val)) {
      isValid = true;
    }
  } else if (node.name == 'BreedLast') {
    let val = values[values.length - 1];
    val = val.replace('?', '');
    if (breedNames.includes(val)) {
      isValid = true;
    }
  } else if (node.name == 'BreedMiddle') {
    const val = values[1];
    if (breedNames.includes(val)) {
      isValid = true;
    }
  }
  // some procedure names I've come across accidentally use the structure of a
  // breed command/reporter, e.g. ___-with, so this makes sure it's not a procedure name
  // before declaring it invalid
  if (!isValid) {
    state.field(stateExtension).Procedures.map((procedure) => {
      if (value == procedure.Name) {
        isValid = true;
      }
    });
  }
  return isValid;
};