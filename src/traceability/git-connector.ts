import {IntoCpsApp} from './../IntoCpsApp';
import { execSync } from 'child_process';
import { Agent } from './models';
import * as path from 'path'
import { pathExistsSync } from 'fs-extra';

class GitUser {
    name: string
    email: string
    constructor(name: string, email: string) {
        this.email = email
        this.name = name
    }
}

class GitConnector {
    static execProjectCmd = (cmd: string) => {
        return execSync(cmd, {cwd: IntoCpsApp.getInstance().getActiveProject().getRootFilePath()})
    }

    static getUserData = () => {
        let uname = GitConnector.execProjectCmd("git config user.name").toString().trim()
        let email = GitConnector.execProjectCmd("git config user.email").toString().trim()
        return new GitUser(uname, email)
    }

    static isGitFolder = () => {
        return pathExistsSync(path.join(IntoCpsApp.getInstance().getActiveProject().getRootFilePath(), ".git/"))
    }

    static initGit = () => {
        if (!GitConnector.isGitFolder()) {
            GitConnector.execProjectCmd("git init")
            GitConnector.execProjectCmd("git add .")
            GitConnector.execProjectCmd('git commit -c "Initialized project git"')
        }
    }

    static getUserAsAgent = () => {
        let user = GitConnector.getUserData()
        return new Agent().setParameters(user.name, user.email)
    }

    static getFileHash = (path:string) => {
        return GitConnector.execProjectCmd(`git hash-object ${path}`).toString().trim()
    }
}

export {GitUser, GitConnector}