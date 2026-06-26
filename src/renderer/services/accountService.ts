export const accountService = {
  listAccounts() {
    return window.whatshub.listAccounts();
  },

  addAccount() {
    return window.whatshub.addAccount();
  },

  renameAccount(id: string, name: string) {
    return window.whatshub.renameAccount(id, name);
  },

  deleteAccount(id: string) {
    return window.whatshub.deleteAccount(id);
  },

  clearSession(id: string) {
    return window.whatshub.clearSession(id);
  },

  showAccount(id: string) {
    return window.whatshub.showAccount(id);
  },

  hideAllViews() {
    return window.whatshub.hideAllViews();
  }
};