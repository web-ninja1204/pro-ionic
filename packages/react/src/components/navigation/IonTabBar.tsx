import { JSX as LocalJSX } from '@ionic/core';
import React, { useContext } from 'react';

import { NavContext } from '../../contexts/NavContext';
import { IonTabBarInner } from '../inner-proxies';
import { IonTabButton } from '../proxies';

type Props = LocalJSX.IonTabBar & {
  onIonTabsDidChange?: (event: CustomEvent<{ tab: string }>) => void;
  onIonTabsWillChange?: (event: CustomEvent<{ tab: string }>) => void;
  currentPath?: string;
  slot?: 'bottom' | 'top';
};

interface Tab {
  originalHref: string;
  currentHref: string;
}

interface State {
  activeTab: string | undefined;
  tabs: { [key: string]: Tab };
}

const IonTabBarUnwrapped = /*@__PURE__*/(() => class extends React.Component<Props, State> {
  context!: React.ContextType<typeof NavContext>;

  constructor(props: Props) {
    super(props);

    const tabActiveUrls: { [key: string]: Tab } = {};

    React.Children.forEach(this.props.children, (child: any) => {
      if (child != null && typeof child === 'object' && child.props && child.type === IonTabButton) {
        tabActiveUrls[child.props.tab] = {
          originalHref: child.props.href,
          currentHref: child.props.href
        };
      }
    });

    this.state = {
      activeTab: undefined,
      tabs: tabActiveUrls
    };
  }

  static getDerivedStateFromProps(props: Props, state: State) {
    const activeTab = Object.keys(state.tabs)
      .find(key => {
        const href = state.tabs[key].originalHref;
        return props.currentPath!.startsWith(href);
      });

    if (activeTab === undefined || (activeTab === state.activeTab && state.tabs[activeTab].currentHref === props.currentPath)) {
      return null;
    }

    return {
      activeTab,
      tabs: {
        ...state.tabs,
        [activeTab]: {
          originalHref: state.tabs[activeTab].originalHref,
          currentHref: props.currentPath
        }
      }
    };
  }

  private onTabButtonClick = (e: CustomEvent<{ href: string, selected: boolean, tab: string }>) => {
    if (this.state.activeTab === e.detail.tab) {
      const originalHref = this.state.tabs[e.detail.tab].originalHref;
      if (this.context.hasIonicRouter()) {
        this.context.tabNavigate(originalHref);
      } else {
        this.context.navigate(originalHref, 'back');
      }
    } else {
      if (this.props.onIonTabsWillChange) {
        this.props.onIonTabsWillChange(new CustomEvent('ionTabWillChange', { detail: { tab: e.detail.tab } }));
      }
      if (this.props.onIonTabsDidChange) {
        this.props.onIonTabsDidChange(new CustomEvent('ionTabDidChange', { detail: { tab: e.detail.tab } }));
      }
      this.context.navigate(this.state.tabs[e.detail.tab].currentHref, 'none');
    }
  }

  private renderChild = (activeTab: string | null | undefined) => (child: (React.ReactElement<LocalJSX.IonTabButton & { onIonTabButtonClick: (e: CustomEvent) => void }>) | null | undefined) => {
    if (child != null && child.props && child.type === IonTabButton) {
      const href = (child.props.tab === activeTab) ? this.props.currentPath : (this.state.tabs[child.props.tab!].currentHref);

      return React.cloneElement(child, {
        href,
        onIonTabButtonClick: this.onTabButtonClick
      });
    }
    return null;
  }

  render() {
    return (
      <IonTabBarInner {...this.props} selectedTab={this.state.activeTab}>
        {React.Children.map(this.props.children as any, this.renderChild(this.state.activeTab))}
      </IonTabBarInner>
    );
  }

  static get contextType() {
    return NavContext;
  }
})();

export const IonTabBar: React.FC<Props> = props => {
  const context = useContext(NavContext);
  return (
    <IonTabBarUnwrapped
      {...props as any}
      currentPath={props.currentPath || context.currentPath}
    >
      {props.children}
    </IonTabBarUnwrapped>
  );
};
