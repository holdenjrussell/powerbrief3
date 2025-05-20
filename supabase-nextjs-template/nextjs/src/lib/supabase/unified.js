export var ClientType;
(function (ClientType) {
    ClientType["SERVER"] = "server";
    ClientType["SPA"] = "spa";
})(ClientType || (ClientType = {}));
export class SassClient {
    constructor(client, clientType) {
        this.client = client;
        this.clientType = clientType;
    }
    async loginEmail(email, password) {
        return this.client.auth.signInWithPassword({
            email: email,
            password: password
        });
    }
    async registerEmail(email, password) {
        return this.client.auth.signUp({
            email: email,
            password: password
        });
    }
    async exchangeCodeForSession(code) {
        return this.client.auth.exchangeCodeForSession(code);
    }
    async resendVerificationEmail(email) {
        return this.client.auth.resend({
            email: email,
            type: 'signup'
        });
    }
    async logout() {
        const { error } = await this.client.auth.signOut({
            scope: 'local'
        });
        if (error)
            throw error;
        if (this.clientType === ClientType.SPA) {
            window.location.href = '/auth/login';
        }
    }
    async uploadFile(myId, filename, file) {
        filename = filename.replace(/[^0-9a-zA-Z!\-_.*'()]/g, '_');
        filename = myId + "/" + filename;
        return this.client.storage.from('files').upload(filename, file);
    }
    async getFiles(myId) {
        return this.client.storage.from('files').list(myId);
    }
    async deleteFile(myId, filename) {
        filename = myId + "/" + filename;
        return this.client.storage.from('files').remove([filename]);
    }
    async shareFile(myId, filename, timeInSec, forDownload = false) {
        filename = myId + "/" + filename;
        return this.client.storage.from('files').createSignedUrl(filename, timeInSec, {
            download: forDownload
        });
    }
    async getMyTodoList(page = 1, pageSize = 100, order = 'created_at', done = false) {
        let query = this.client.from('todo_list').select('*').range(page * pageSize - pageSize, page * pageSize - 1).order(order);
        if (done !== null) {
            query = query.eq('done', done);
        }
        return query;
    }
    async createTask(row) {
        return this.client.from('todo_list').insert(row);
    }
    async removeTask(id) {
        return this.client.from('todo_list').delete().eq('id', id);
    }
    async updateAsDone(id) {
        return this.client.from('todo_list').update({ done: true }).eq('id', id);
    }
    getSupabaseClient() {
        return this.client;
    }
}
