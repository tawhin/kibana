import ReactDOM from 'react-dom';
import React from 'react';
import { elasticLogo } from '../../common/functions/image/elastic_logo';
import { isValid } from '../../common/lib/dataurl';

export const image = () => ({
  name: 'image',
  displayName: 'Image',
  help: 'Render an image',
  reuseDomNode: true,
  render(domNode, config, handlers) {
    const dataurl = isValid(config.dataurl) ? config.dataurl : elasticLogo;

    const style = {
      height: '100%',
      backgroundImage: `url(${dataurl})`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center center',
      backgroundSize: config.mode,
    };

    ReactDOM.render(<div style={style} />, domNode, () => handlers.done());

    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});
