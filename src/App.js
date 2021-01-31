import React from 'react';
import './App.css';
import { Router, Route, Link } from 'react-router-dom';
import { createBrowserHistory } from "history";
import RouterConfig from './router';

const history = createBrowserHistory();
class App extends React.Component {

  render () {
    console.log(RouterConfig);
    return (
      <div style={{
        width: '100vw',
        height: '100vh',  
        display: 'flex',
        flexWrap: 'nowrap',
      }}>
          <Router history={history}>
        <div style={{
          height: '100%',
          width: 100,
        }}>
          {RouterConfig.map(e => {
            return <div style={{ margin: '20px 0'}}>
              <Link to={e.path}>
                {e.title}
              </Link>
            </div>
          })}
        </div>
        <div style={{
          flex: '1 1',
        }}>
            {RouterConfig.map(route => (
              <Route key={route.path} path={route.path} component={route.component} exact />
            ))}
        </div>
          </Router>
      </div>
    );
  }
}

export default App;
