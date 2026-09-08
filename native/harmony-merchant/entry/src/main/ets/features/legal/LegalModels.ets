export interface LegalSection {
  title: string;
  updatedAt: string;
  body: string;
}

export interface LegalAgreementSet {
  user: LegalSection;
  privacy: LegalSection;
  collect: LegalSection;
}

export class AgreementRouteParams {
  kind: string = 'user';

  constructor(kind: string) {
    this.kind = kind;
  }
}

