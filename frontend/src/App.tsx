import React, {useEffect} from 'react';
import './App.css';
import {Layout} from 'antd';
import Sider from './components/sider';
import {Routes, Route} from "react-router-dom";
import ErrorPage from './components/errorPage';
import Explore from './routes/explore';
import Profile from './routes/profile';
import Settings from './routes/settings';
import {Home} from "./routes/home";
import {useAuth} from "./utils/useAuth";
import Feed from "./actors/feed";
import {userApi} from "./actors/user";
import {updateProfile} from "./redux";

function App() {
  const {userFeedCai, principal} = useAuth()

  const fetch = async () => {
    if (!userFeedCai) return
    const feedApi = new Feed(userFeedCai)
    await feedApi.getAllPost()
    await feedApi.getLatestFeed(20)
    if (!principal) return
    const res = await userApi.getProfile(principal)
    if (!res[0]) return
    updateProfile(res[0])
  }

  useEffect(() => {
    fetch()
  }, [userFeedCai, principal])

  return (
    <div className="App">
      <Layout
        hasSider={true}
        style={{
          height: '100vh',
        }}
      >
        <Layout.Sider
          theme='light'
          width={300}
        >
          <Sider/>
        </Layout.Sider>
        <Routes>
          <Route path="/" element={<Home/>}/>
          <Route path="home" element={<Home/>}/>
          <Route path="explore" element={<Explore/>}/>
          <Route path="profile/:userid" element={<Profile/>}/>
          <Route path="settings" element={<Settings/>}/>
          <Route path="*" element={<ErrorPage/>}/>
        </Routes>
      </Layout>
    </div>
  );
}

export default App;
