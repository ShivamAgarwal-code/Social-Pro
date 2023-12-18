import React, {createContext, useContext, useEffect, useState} from "react";
import {authClient, IIForIdentity} from "./IIForIdentity";
import {DelegationIdentity} from "@dfinity/identity";
import {Principal} from "@dfinity/principal";
import {rootFeedApi} from "../actors/rootFeed";
import {notification} from "antd";
import {NotificationInstance} from "antd/es/notification/interface";
import {CheckOutlined, CloseOutlined, LoadingOutlined} from "@ant-design/icons";

export interface Props {
  readonly identity: DelegationIdentity | undefined;
  readonly isAuthClientReady: boolean;
  readonly principal: Principal | undefined;
  readonly userFeedCai: Principal | undefined
  readonly logOut: Function | undefined;
  readonly logIn: Function | undefined;
  readonly isAuth: boolean;
}

export const useProvideAuth = (api: NotificationInstance, authClient: IIForIdentity): Props => {
  const [_identity, _setIdentity] = useState<DelegationIdentity | undefined>(undefined);
  const [isAuthClientReady, setAuthClientReady] = useState(false);
  const [principal, setPrincipal] = useState<Principal | undefined>(undefined);
  const [userFeedCai, setUserFeedCai] = useState<Principal | undefined>()
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  if (!isAuthClientReady) authClient.create().then(() => setAuthClientReady(true));

  const init = async () => {
    const [identity, isAuthenticated] = await Promise.all([
      authClient.getIdentity(),
      authClient.isAuthenticated(),
    ])
    if (!isAuthenticated) return {message: "not login"}
    const principal = identity?.getPrincipal() as Principal | undefined;
    setPrincipal(principal);
    _setIdentity(identity as DelegationIdentity | undefined);
    if (isAuthenticated) {
      setAuthenticated(true);
    }
    setAuthClientReady(true);
  }
  useEffect(() => {
    isAuthClientReady && init().then()
  }, [isAuthClientReady]);

  const getFeedCai = async (principal: Principal) => {
    const e = await rootFeedApi.getUserFeedCanister(principal)
    let cai = e
    if (!e) {
      api.info({
        message: 'Creating Feed Canister ...',
        key: 'createFeed',
        duration: null,
        description: '',
        icon: <LoadingOutlined/>
      })
      try {
        cai = await rootFeedApi.createFeedCanister()
        api.success({
          message: 'Create Successful !',
          key: 'createFeed',
          description: '',
          icon: <CheckOutlined/>
        });
      } catch (e) {
        api.error({
          message: 'Create Failed !',
          key: 'createFeed',
          description: '',
          icon: <CloseOutlined/>
        })
      }
    }
    setUserFeedCai(cai)
  }
//aa3zr-2je3k-6vmid-vj657-x36hs-ylxag-e2jd5-pufmf-hh26e-uttum-rae
  useEffect(() => {
    principal && getFeedCai(principal)
  }, [principal])

  const logIn = async (): Promise<{ message?: string; status?: number } | undefined> => {
    try {
      if (!authClient) return {message: "connect error"};
      const identity = await authClient.login();
      const principal = identity.getPrincipal();
      setPrincipal(principal);
      if (identity) {
        _setIdentity(_identity);
        setAuthenticated(true);
      } else {
        return {message: "connect error"};
      }
    } catch (e) {
      console.warn(e)
    }
  };

  const logOut = async (): Promise<void> => {
    await authClient.logout();
    setAuthenticated(false);
  };


  const Context: Props = {
    identity: _identity,
    isAuthClientReady,
    principal,
    logIn,
    logOut,
    userFeedCai,
    isAuth: authenticated,
  };
  return Context;
}

const props: Props = {
  identity: undefined,
  isAuthClientReady: false,
  principal: undefined,
  logIn: undefined,
  logOut: undefined,
  isAuth: false,
  userFeedCai: undefined
}

const authContext = createContext(props);

export function ProvideAuth({children}: any) {
  const [api, contextHolder] = notification.useNotification();
  const auth = useProvideAuth(api, authClient);
  return (
    <authContext.Provider value={Object.assign(auth)}>
      {contextHolder}
      {children}
    </authContext.Provider>
  );
}

export const useAuth = () => {
  return useContext(authContext);
};
