import { BrowserWindow, ipcMain, IpcMainInvokeEvent } from "electron";
import log from "electron-log/main";
import { IpcIHData, IpcSOData } from "@/type/ipc";

export type IpcRendererInvoke = {
  [K in keyof IpcIHData]: (
    ...args: IpcIHData[K]["args"]
  ) => Promise<IpcIHData[K]["return"]>;
};

export type IpcMainHandle = {
  [K in keyof IpcIHData]: (
    event: import("electron").IpcMainInvokeEvent,
    ...args: IpcIHData[K]["args"]
  ) => Promise<IpcIHData[K]["return"]> | IpcIHData[K]["return"];
};

export type IpcMainSend = {
  [K in keyof IpcSOData]: (
    win: import("electron").BrowserWindow,
    ...args: IpcSOData[K]["args"]
  ) => void;
};

export type IpcRendererOn = {
  [K in keyof IpcSOData]: (
    event: import("electron").IpcRendererEvent,
    ...args: IpcSOData[K]["args"]
  ) => Promise<IpcSOData[K]["return"]> | IpcSOData[K]["return"];
};

export function registerIpcMainHandle<T extends IpcMainHandle>(
  listeners: T,
): void;
export function registerIpcMainHandle(listeners: {
  [key: string]: (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown;
}) {
  Object.entries(listeners).forEach(([channel, listener]) => {
    const errorHandledListener: typeof listener = (event, ...args) => {
      try {
        validateIpcSender(event);
        return listener(event, ...args);
      } catch (e) {
        log.error(e);
      }
    };
    ipcMain.handle(channel, errorHandledListener);
  });
}

export const ipcMainSend = new Proxy(
  {},
  {
    get:
      (_, channel: string) =>
      (win: BrowserWindow, ...args: unknown[]) =>
        win.webContents.send(channel, ...args),
  },
) as IpcMainSend;

/** IPCメッセージの送信元を確認する */
const validateIpcSender = (event: IpcMainInvokeEvent) => {
  let isValid: boolean;
  const senderUrl = new URL(event.senderFrame.url);
  if (process.env.VITE_DEV_SERVER_URL != undefined) {
    const devServerUrl = new URL(process.env.VITE_DEV_SERVER_URL);
    isValid = senderUrl.origin === devServerUrl.origin;
  } else {
    isValid = senderUrl.protocol === "app:";
  }
  if (!isValid) {
    throw new Error(
      `不正なURLからのIPCメッセージを検出しました。senderUrl: ${senderUrl.toString()}`,
    );
  }
};
