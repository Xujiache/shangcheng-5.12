export class IdRouteParams {
  id: string;
  action: string;

  constructor(id: string = '', action: string = '') {
    this.id = id;
    this.action = action;
  }
}

export class FilterRouteParams {
  status: string;

  constructor(status: string = '') {
    this.status = status;
  }
}
