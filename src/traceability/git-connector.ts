import {IntoCpsApp} from './../IntoCpsApp';
import { execSync } from 'child_process';

class GitUser {
    username: string
    email: string
    constructor(username: string, email: string) {
        this.email = email
        this.username = username
    }
}

class GitConnector {
    appInstance: IntoCpsApp;

    constructor() {
        this.appInstance = IntoCpsApp.getInstance()
    }

    getUserData = () => {
        let uname = this.execProjectCmd("git config user.name").toString().trim()
        let email = this.execProjectCmd("git config user.email").toString().trim()
        return new GitUser(uname, email)
    }

    execProjectCmd = (cmd: string) => {
        return execSync(cmd, {cwd: this.appInstance.getActiveProject().getRootFilePath()})
    }
}

export {GitUser, GitConnector}