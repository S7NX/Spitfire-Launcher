import { invoke } from '@tauri-apps/api/core';

export default class Process {
  static async getProcesses() {
    const list: string[] = await invoke('get_processes');

    return list.map((process) => {
      const [pid, name] = process.split(' - ');
      return {
        pid: parseInt(pid),
        name
      };
    });
  }
}