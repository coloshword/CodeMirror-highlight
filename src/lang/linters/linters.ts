import { IdentifierLinter } from './identifier-linter';
import { UnrecognizedGlobalLinter } from './unrecognized-global-linter';
import { BreedLinter } from './breed-linter';
import { UnrecognizedLinter } from './unrecognized-linter';
import { ArgumentLinter } from './argument-linter';
import { UnsupportedLinter } from './unsupported-linter';
import { ExtensionLinter } from './extension-linter';
import { NamingLinter } from './naming-linter';
import { BracketLinter } from './bracket-linter';
import { ModeLinter } from './mode-linter';
import { ContextLinter } from './context-linter';
import { CodeBlockLinter } from './codeblock-linter';

export const netlogoLinters = [
  UnrecognizedLinter,
  UnrecognizedGlobalLinter,
  IdentifierLinter,
  BreedLinter,
  ArgumentLinter,
  UnsupportedLinter,
  ExtensionLinter,
  NamingLinter,
  BracketLinter,
  ModeLinter,
  ContextLinter,
  CodeBlockLinter,
];
