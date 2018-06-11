import React from 'react';
import PropTypes from 'prop-types';

export class ElementShareContainer extends React.PureComponent {
  static propTypes = {
    functionName: PropTypes.string.isRequired,
    onComplete: PropTypes.func.isRequired,
    className: PropTypes.string,
    children: PropTypes.node.isRequired,
  };

  state = {
    renderComplete: false,
  };

  componentDidMount() {
    const { functionName, onComplete } = this.props;
    const isDevelopment = process.env.NODE_ENV !== 'production';
    let t;

    // check that the done event is called within a certain time
    if (isDevelopment) {
      const timeout = 15000; // 15 seconds
      t = setTimeout(() => {
        // TODO: show this message in a proper notification
        console.warn(`done handler never called in render function: ${functionName}`);
      }, timeout);
    }

    // dispatches a custom DOM event on the container when the element is complete
    onComplete(() => {
      clearTimeout(t);
      const ev = new Event('renderComplete');
      this.sharedItemRef.dispatchEvent(ev);

      // if the element is finished before reporting is listening for then
      // renderComplete event, the report never completes. to get around that
      // issue, track the completed state locally and set the
      // [data-render-complete] value accordingly.
      // this is similar to renderComplete directive in Kibana,
      // see: src/ui/public/render_complete/directive.js
      this.setState({ renderComplete: true });
    });
  }

  render() {
    // NOTE: the data-shared-item and data-render-complete attributes are used for reporting
    return (
      <div
        data-shared-item
        data-render-complete={this.state.renderComplete}
        className={this.props.className}
        ref={ref => (this.sharedItemRef = ref)}
      >
        {this.props.children}
      </div>
    );
  }
}
