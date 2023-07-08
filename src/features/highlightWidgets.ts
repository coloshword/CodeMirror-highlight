import { WidgetType } from '@codemirror/view';

export class textWidget extends WidgetType {
  widgetText: string;
  textColor: string;
  textDecoration: string;
  constructor(text: string, color = '', decoration = '') {
    super();
    this.widgetText = text;
    this.textColor = color;
    this.textDecoration = decoration;
  }

  toDOM() {
    console.log('toDOM');
    let wrap = document.createElement('span');
    wrap.setAttribute('aria-hidden', 'true');
    wrap.className = 'cm-text';
    wrap.textContent = this.widgetText;
    // optional parameters
    if (this.textColor != '') wrap.style.color = this.textColor;
    if (this.textDecoration != '') wrap.style.textDecoration = this.textDecoration;
    return wrap;
  }
}
