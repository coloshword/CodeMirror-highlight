import { selectAll } from '@codemirror/commands';
import { EditorView } from '@codemirror/view';
import { GalapagosEditor } from '../editor';
import { diffWords } from 'diff';
import { Text } from '@codemirror/text';
import { Decoration } from '@codemirror/view';
import { StateEffect, StateField } from '@codemirror/state';
import { Range } from '@codemirror/rangeset';
import { SearchCursor } from '@codemirror/search';
import { DecorationSet } from '@codemirror/view';

/** SelectionFeatures: The selection and cursor features of the editor. */
export class SelectionFeatures {
  /** CodeMirror: The CodeMirror EditorView. */
  public CodeMirror: EditorView;
  /** Galapagos: The Galapagos Editor. */
  public Galapagos: GalapagosEditor;
  /** Constructor: Initialize the editing features. */
  public constructor(Galapagos: GalapagosEditor) {
    this.Galapagos = Galapagos;
    this.CodeMirror = Galapagos.CodeMirror;
  }

  // #region "Selection and Cursor"
  /** SelectAll: Select all text in the editor. */
  SelectAll() {
    selectAll(this.CodeMirror);
    this.CodeMirror.focus();
  }
  /** Select: Select and scroll to a given range in the editor. */
  Select(Start: number, End: number) {
    if (End > this.CodeMirror.state.doc.length || Start < 0 || Start > End) {
      return;
    }
    this.CodeMirror.dispatch({
      selection: { anchor: Start, head: End },
      scrollIntoView: true,
    });
    this.CodeMirror.focus();
  }
  /** GetSelection: Returns an object of the start and end of
   *  a selection in the editor. */
  GetSelection() {
    return {
      from: this.CodeMirror.state.selection.main.from,
      to: this.CodeMirror.state.selection.main.to,
    };
  }
  /** GetSelections: Get the selections of the editor. */
  GetSelections() {
    return this.CodeMirror.state.selection.ranges;
  }
  /** GetCursorPosition: Set the cursor position of the editor. */
  GetCursorPosition(): number {
    return this.CodeMirror.state.selection.ranges[0]?.from ?? 0;
  }
  /** SetCursorPosition: Set the cursor position of the editor. */
  SetCursorPosition(position: number) {
    this.CodeMirror.dispatch({
      selection: { anchor: position },
      scrollIntoView: true,
    });
  }
  /** RefreshCursor: Refresh the cursor position. */
  RefreshCursor() {
    this.SetCursorPosition(this.GetCursorPosition());
  }
  // #endregion

  // #region "Highlighting Changes"
  /** HighlightChanges: Highlight the changes in the editor. */
  HighlightChanges(PreviousVersion: string) {
    var CurrentVersion = this.Galapagos.GetCode();
    // create diff instance comparing previous and current
    var diff = diffWords(PreviousVersion, CurrentVersion);
  
    // separate words into added, removed, and same arrays based on diff obj
    let added = diff.filter((part) => part.added).map((part) => part.value);
    let removed = diff.filter((part) => part.removed).map((part) => part.value);
    let same = diff.filter((part) => !part.added && !part.removed).map((part) => part.value);
  
    console.log(diff);
  
    let consolidatedString = diff.map((part) => part.value).join('');
    const transaction = this.CodeMirror.state.update({
      changes: {
        from: 0,
        to: this.CodeMirror.state.doc.length,
        insert: consolidatedString,
      },
    });
    this.CodeMirror.dispatch(transaction);
  
    // find index of added words
    let word: string = 'wow';
    let cursor = new SearchCursor(this.CodeMirror.state.doc, word);
    cursor.next();
    
  }
  
}
  // #endregion
