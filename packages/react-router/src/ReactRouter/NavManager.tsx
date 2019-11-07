import { RouterDirection } from '@ionic/core';
import { NavContext, NavContextState } from '@ionic/react';
import { Location as HistoryLocation, UnregisterCallback } from 'history';
import React from 'react';
import { RouteComponentProps } from 'react-router-dom';

import { generateId } from '../utils';
import { LocationHistory } from '../utils/LocationHistory';

import { StackManager } from './StackManager';
import { ViewItem } from './ViewItem';
import { ViewStack } from './ViewStacks';

interface NavManagerProps extends RouteComponentProps {
  findViewInfoByLocation: (location: HistoryLocation) => { view?: ViewItem, viewStack?: ViewStack };
  findViewInfoById: (id: string) => { view?: ViewItem, viewStack?: ViewStack };
  getActiveIonPage: () => { view?: ViewItem, viewStack?: ViewStack };
  onNavigate: (type: 'push' | 'replace', path: string, state?: any) => void;
}

export class NavManager extends React.Component<NavManagerProps, NavContextState> {

  listenUnregisterCallback: UnregisterCallback | undefined;
  locationHistory: LocationHistory = new LocationHistory();

  constructor(props: NavManagerProps) {
    super(props);
    this.state = {
      goBack: this.goBack.bind(this),
      hasIonicRouter: () => true,
      navigate: this.navigate.bind(this),
      getStackManager: this.getStackManager.bind(this),
      getPageManager: this.getPageManager.bind(this),
      currentPath: this.props.location.pathname,
      registerIonPage: () => { return; }, // overridden in View for each IonPage
      tabNavigate: this.tabNavigate.bind(this)
    };

    this.listenUnregisterCallback = this.props.history.listen((location: HistoryLocation) => {
      this.setState({
        currentPath: location.pathname
      });
      this.locationHistory.add(location);
    });

    this.locationHistory.add({
      hash: window.location.hash,
      key: generateId(),
      pathname: window.location.pathname,
      search: window.location.search,
      state: {}
    });
  }

  componentWillUnmount() {
    if (this.listenUnregisterCallback) {
      this.listenUnregisterCallback();
    }
  }

  goBack(defaultHref?: string) {
    const { view: activeIonPage } = this.props.getActiveIonPage();
    if (activeIonPage) {
      const { view: enteringView } = this.props.findViewInfoById(activeIonPage.prevId!);
      if (enteringView) {
        const lastLocation = this.locationHistory.findLastLocation(enteringView.routeData.match.url);
        if (lastLocation) {
          this.props.onNavigate('replace', lastLocation.pathname + lastLocation.search, 'back');
        } else {
          this.props.onNavigate('replace', enteringView.routeData.match.url, 'back');
        }
      } else {
        if (defaultHref) {
          this.props.onNavigate('replace', defaultHref, 'back');
        }
      }
    } else {
      if (defaultHref) {
        this.props.onNavigate('replace', defaultHref, 'back');
      }
    }
  }

  navigate(path: string, direction?: RouterDirection | 'none') {
    this.props.onNavigate('push', path, direction);
  }

  tabNavigate(path: string) {
    this.props.onNavigate('replace', path, 'back');
  }

  getPageManager() {
    return (children: any) => children;
  }

  getStackManager() {
    return StackManager;
  }

  render() {
    return (
      <NavContext.Provider value={this.state}>
        {this.props.children}
      </NavContext.Provider>
    );
  }

}
