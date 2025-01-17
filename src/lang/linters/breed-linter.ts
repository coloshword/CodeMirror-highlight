import { syntaxTree } from '@codemirror/language';
import { Diagnostic } from '@codemirror/lint';
import { SyntaxNode } from '@lezer/common';
import { Linter } from './linter-builder';
import { Breed, BreedType } from '../classes/structures';
import { CheckContext, checkBreed, checkValidIdentifier, getCheckContext } from '../utils/check-identifier';
import { getCodeName } from '../utils/code';

// BreedLinter: To check breed commands/reporters for valid breed names
export const BreedLinter: Linter = (view, preprocessContext, lintContext) => {
  const diagnostics: Diagnostic[] = [];
  const breeds: Breed[] = Array.from(lintContext.Breeds.values());
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
        const node = noderef.node;
        const value = getCodeName(view.state, node);
        let result = checkValidBreed(node, value, context, breeds);
        // JC: Honestly, I don't understand why we check breed in 2 places - I tried to merge the code, but there might be new problems
        if (!result.isValid) checkBreed(diagnostics, context, view, node);
      }
    });
  return diagnostics;
};

// checkValidBreed: Checks if the term in the structure of a breed command/reporter
// is the name of an actual breed, and in the correct singular/plural form
const checkValidBreed = function (node: SyntaxNode, value: string, context: CheckContext, breeds: Breed[]) {
  //let isValid = true;
  let result = {
    isValid: true,
    isPlural: false,
    isLink: false,
    newBreed: true,
  };
  //console.log(breeds)
  //collect possible breed names in the correct categories
  let pluralTurtle: string[] = [];
  let singularTurtle: string[] = [];
  let pluralLink: string[] = [];
  let singularLink: string[] = [];
  for (let b of breeds) {
    if (b.BreedType == BreedType.DirectedLink || b.BreedType == BreedType.UndirectedLink) {
      pluralLink.push(b.Plural);
      singularLink.push(b.Singular);
    } else if (b.BreedType == BreedType.Turtle) {
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
  } else if (node.name == 'SpecialReporter0ArgsLink' || node.name == 'SpecialReporter1ArgsLink') {
    result.isValid = listItemInString(value, singularLink);
    result.isLink = true;
    result.isPlural = false;
  } else if (node.name == 'SpecialReporter1ArgsBoth') {
    result.isValid = listItemInString(value, singularLink.concat(singularTurtle));
    result.isLink = false;
    result.isPlural = false;
  } else if (node.name == 'Own' || node.name == 'Arg') {
    result.isValid = listItemInString(value, pluralLink.concat([...pluralTurtle, 'patches']));
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
    result.newBreed = false;
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
