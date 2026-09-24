import { IBestDialogUtil } from '@ibestservices/ibest-ui';
import { I18n } from '../i18n/I18n';

export class LeaveGuard {
  private showing: boolean = false;
  request(language: string, busy: boolean, dirty: boolean, leave: () => void): void {
    if (busy || this.showing) return;
    if (!dirty) { leave(); return; }
    this.showing = true;
    IBestDialogUtil.open({
      title: I18n.text(language, '放弃未保存的修改？', 'Discard unsaved changes?'),
      message: I18n.text(language, '修改尚未提交，继续编辑可保留当前内容。', 'These changes have not been submitted. Keep editing to preserve your draft.'),
      showCancelButton: true,
      cancelButtonText: I18n.text(language, '继续编辑', 'Keep editing'),
      confirmButtonText: I18n.text(language, '放弃修改', 'Discard'),
      onCancel: () => { this.showing = false; },
      onConfirm: () => { this.showing = false; leave(); }
    });
  }
}
