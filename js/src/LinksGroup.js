export class LinksGroup {
  constructor(element, children = []) {
    this.element = element;
    this.children = children;
  }

  toList() {
    const result = [];
    this._appendToList(result);
    return result;
  }

  _appendToList(list) {
    list.push(this.element);
    if (this.children && this.children.length > 0) {
      for (const child of this.children) {
        if (child instanceof LinksGroup) {
          child._appendToList(list);
        } else {
          list.push(child);
        }
      }
    }
  }

  toString() {
    const list = this.toList();
    return list.map((item) => `(${item.id || item})`).join(' ');
  }
}
