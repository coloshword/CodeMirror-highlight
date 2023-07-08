import { selectAll } from '@codemirror/commands';
import { EditorView, Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { GalapagosEditor } from '../editor';
import { StateEffect, StateField } from '@codemirror/state';
import { textWidget, CheckboxWidget } from './highlightWidgets';
import { Text } from '@codemirror/text';
import { diffWords } from 'diff';
import { SearchCursor } from '@codemirror/search';

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
    let CurrentVersion: string = this.CodeMirror.state.doc.toString();
    const editor = this.CodeMirror;
    // create diff instance comparing the two strings
    let diff = diffWords(PreviousVersion, CurrentVersion);
    console.log(diff);
    // separate words into added and removed
    let removed = diff.filter((part) => part.removed).map((part) => part.value);

    // Make current EditorView display doc of PreviousVersion to highlight changes
    let length = this.CodeMirror.state.doc.length;
    let prevAsArr = PreviousVersion.split('\n');
    let prevAsText = Text.of(prevAsArr);
    // create a transaction to change the current doc
    let tr = this.CodeMirror.state.update({ changes: { from: 0, to: length, insert: prevAsText } });
    this.CodeMirror.dispatch(tr);

    // highlight words that are removed using mark decoration so as to not interfere with linter -- (the word isn't actually removed from the doc)
    const addEffect = StateEffect.define<{ from: number; to: number }>({
      map: ({ from, to }, change) => ({ from: change.mapPos(from), to: change.mapPos(to) }),
    });

    const removedMark = Decoration.mark({ class: 'cm-removed' }); //mark decoration for removed words
    const removedTheme = EditorView.baseTheme({
      '.cm-removed': { textDecoration: 'line-through', color: 'red', fontWeight: 'bold' },
    });

    // define statefield for removed words using mark decoration
    const removedField = StateField.define<DecorationSet>({
      create() {
        return Decoration.none;
      },
      update(value, tr) {
        value = value.map(tr.changes);
        for (let e of tr.effects) {
          if (e.is(addEffect)) {
            value = value.update({
              add: [removedMark.range(e.value.from, e.value.to)],
            });
          }
        }
        return value;
      },
      provide: (f) => EditorView.decorations.from(f),
    });

    // use statefield in highlightremoved function
    function highlightRemoved(view: EditorView, word: string) {
      let effects: StateEffect<any>[] = [];
      // create a cursor to find the word
      let cursor = new SearchCursor(view.state.doc, word, 0);
      // find the word
      cursor.next();
      effects.push(
        addEffect.of({
          from: cursor.value.from,
          to: cursor.value.to,
        })
      );
      if (!effects.length) return false;
      if (!view.state.field(removedField, false)) {
        effects.push(StateEffect.appendConfig.of([removedField, removedTheme]));
      }
      view.dispatch({ effects });
      return true;
    }
    console.log(removed);
    removed.forEach((word) => highlightRemoved(this.CodeMirror, word));
    // highlighlight words added using widget decoration so the linter doesn't see it as a new word
    console.log(diff);

    let added: string[] = diff.filter((part) => part.added).map((part) => part.value);
    let addedPos = 0;
    // create text widgets
    const addTextWidget = StateEffect.define<{ from: number; to: number }>({
      map: ({ from, to }, change) => ({ from: change.mapPos(from), to: change.mapPos(to) }),
    });

    const addCheckbox = StateEffect.define<{ from: number; to: number }>({
      map: ({ from, to }, change) => ({ from: change.mapPos(from), to: change.mapPos(to) }),
    });

    // create the field
    const checkboxField = StateField.define<DecorationSet>({
      create: () => Decoration.none,

      update(underlines, tr) {
        underlines = underlines.map(tr.changes);
        for (let e of tr.effects)
          if (e.is(addTextWidget)) {
            let decorationWidget = Decoration.widget({
              widget: new textWidget(added[addedPos], 'green'),
              side: 1,
            });
            addedPos++;
            underlines = underlines.update({
              add: [decorationWidget.range(e.value.to)],
            });
          } else if (e.is(addCheckbox)) {
            let decorationWidget = Decoration.widget({
              widget: new CheckboxWidget(editor, CurrentVersion),
              side: 10,
            });
            underlines = underlines.update({
              add: [decorationWidget.range(e.value.to)],
            });
          }
        return underlines;
      },
      provide: (f) => EditorView.decorations.from(f),
    });

    function makeWidget(view: EditorView, end: number, type: string = 'text') {
      let effects: StateEffect<any>[] = [];
      if (type === 'text') {
        effects.push(
          addTextWidget.of({
            from: 0,
            to: end,
          })
        );
      } else {
        effects.push(
          addCheckbox.of({
            from: 0,
            to: end,
          })
        );
      }
      if (!effects.length) return false;

      effects.push(StateEffect.appendConfig.of([checkboxField]));
      view.dispatch({ effects });
      console.log(effects);
      return true;
    }

    let currentPos = 0;
    diff.forEach((part) => {
      //updated current position
      if (part.added) {
        // add the widget to the editor
        makeWidget(this.CodeMirror, currentPos);
      } else {
        // update position
        currentPos += part.value.length;
      }
    });
    // add checkbox at the end of the editor
    makeWidget(this.CodeMirror, currentPos, 'checkbox');
  }
}
// #endregion
