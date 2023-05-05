import { syntaxTree } from '@codemirror/language';
import { Diagnostic } from '@codemirror/lint';
import { SyntaxNode } from '@lezer/common';
import { Localized } from '../../editor';
import { Linter } from './linter-builder';
import { Breed, BreedType } from '../classes';
import {
  CheckContext,
  checkValidIdentifier,
  getCheckContext,
} from './utils/check-identifier';
import { GalapagosEditing } from '../../codemirror/code-editing';
import {
  getBreedName,
  otherBreedName,
} from '../../codemirror/utils/breed-utils';
import { EditorView } from 'codemirror';

let Editing = new GalapagosEditing();

// BreedLinter: To check breed commands/reporters for valid breed names
export const BreedLinter: Linter = (view, preprocessContext, lintContext) => {
  const diagnostics: Diagnostic[] = [];
  const breeds = Array.from(lintContext.Breeds.values());
  const context = getCheckContext(view, lintContext, preprocessContext);
  syntaxTree(view.state)
    .cursor()
    .iterate((noderef) => {
      if (
        noderef.name == 'SpecialReporter1ArgsBoth' ||
        noderef.name == 'SpecialReporter0ArgsTurtle' ||
        noderef.name == 'SpecialReporter1ArgsTurtle' ||
        noderef.name == 'SpecialReporter2ArgsTurtle' ||
        noderef.name == 'SpecialReporter0ArgsLink' ||
        noderef.name == 'SpecialReporter0ArgsLinkP' ||
        noderef.name == 'SpecialReporter1ArgsLink' ||
        noderef.name == 'SpecialCommandCreateTurtle' ||
        noderef.name == 'SpecialCommandCreateLink' ||
        noderef.name == 'Own'
      ) {
        //console.log(lintContext)
        const Node = noderef.node;
        const value = view.state
          .sliceDoc(noderef.from, noderef.to)
          .toLowerCase();
        let result = checkValidBreed(Node, value, context, breeds);
        if (!result.isValid) {
          let breed_result = getBreedName(value);
          let actions: any[] = [];
          if (result.make_new_breed) {
            let plural = '';
            let singular = '';
            if (result.isPlural) {
              plural = breed_result.breed;
              singular = otherBreedName(breed_result.breed, true);
            } else {
              singular = breed_result.breed;
              plural = otherBreedName(breed_result.breed, false);
            }
            let breed_type = result.isLink ? 'undirected-link-breed' : 'breed';
            actions.push(getAction(Node, value, breed_type, plural, singular));
          }
          diagnostics.push({
            from: noderef.from,
            to: noderef.to,
            severity: 'error',
            message: Localized.Get('Unrecognized breed name _', value),
            actions: actions,
          });
        }
      }
    });
  return diagnostics;
};

const getAction = function (
  node: SyntaxNode,
  value: string,
  breed_type: string,
  plural: string,
  singular: string
) {
  return {
    name: Localized.Get('Add'),
    apply(view: EditorView, from: number, to: number) {
      Editing.AddBreed(view, breed_type, plural, singular);
    },
  };
};

// checkValidBreed: Checks if the term in the structure of a breed command/reporter
// is the name of an actual breed, and in the correct singular/plural form
const checkValidBreed = function (
  node: SyntaxNode,
  value: string,
  context: CheckContext,
  breeds: Breed[]
) {
  //let isValid = true;
  let result = {
    isValid: true,
    isPlural: false,
    isLink: false,
    make_new_breed: true,
  };
  //console.log(breeds)
  //collect possible breed names in the correct categories
  let pluralTurtle: string[] = [];
  let singularTurtle: string[] = [];
  let pluralLink: string[] = [];
  let singularLink: string[] = [];
  for (let b of breeds) {
    if (
      b.BreedType == BreedType.DirectedLink ||
      b.BreedType == BreedType.UndirectedLink
    ) {
      pluralLink.push(b.Plural);
      singularLink.push(b.Singular);
    } else {
      pluralTurtle.push(b.Plural);
      singularTurtle.push(b.Singular);
    }
  }
  //console.log(pluralTurtle,singularTurtle,pluralLink,singularLink)
  //check for correct breed name (depending on function type)
  if (node.name == 'SpecialCommandCreateLink') {
    result.isValid = listItemInString(value, singularLink.concat(pluralLink));
    result.isLink = true;
    result.isPlural = false;
  } else if (
    node.name == 'SpecialReporter0ArgsLink' ||
    node.name == 'SpecialReporter1ArgsLink'
  ) {
    result.isValid = listItemInString(value, singularLink);
    result.isLink = true;
    result.isPlural = false;
  } else if (node.name == 'SpecialReporter1ArgsBoth') {
    result.isValid = listItemInString(
      value,
      singularLink.concat(singularTurtle)
    );
    result.isLink = false;
    result.isPlural = false;
  } else if (node.name == 'Own' || node.name == 'Arg') {
    result.isValid = listItemInString(value, pluralLink.concat(pluralTurtle));
    result.isLink = false;
    result.isPlural = true;
  } else if (
    node.name == 'SpecialCommandCreateTurtle' ||
    node.name == 'SpecialReporter2ArgsTurtle' ||
    node.name == 'SpecialReporter1ArgsTurtle' ||
    node.name == 'SpecialReporter0ArgsTurtle'
  ) {
    result.isValid = listItemInString(value, pluralTurtle);
    result.isLink = false;
    result.isPlural = true;
  } else if (node.name == 'SpecialReporter0ArgsLinkP') {
    result.isValid = listItemInString(value, pluralLink);
    result.isLink = true;
    result.isPlural = true;
  } else {
    result.make_new_breed = false;
  }
  // some procedure names I've come across accidentally use the structure of a
  // breed command/reporter, e.g. ___-with, so this makes sure it's not a procedure name
  // before declaring it invalid
  if (!result.isValid && context.parseState.Procedures.get(value)) {
    result.isValid = true;
  }
  if (!result.isValid && node.name != 'Own') {
    // Why do we need this one?
    //We need it to check if it is actually a valid identifier, e.g. a variable name
    result.isValid = checkValidIdentifier(node, value, context);
  }
  return result;
};

//listItemInString: checks if any member of a list is in a string
const listItemInString = function (str: string, lst: string[]) {
  let found = false;
  for (let l of lst) {
    if (str.includes(l)) {
      found = true;
      break;
    }
  }
  return found;
};
