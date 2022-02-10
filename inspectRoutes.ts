import { Application } from 'express';

export const divider = (): void => console.log('-----------------------------------------------------');

export const split = (thing: any) => {
  if (typeof thing === 'string') {
    return thing.split('/');
  } else if (thing.fast_slash) {
    return '';
  } else {
    const match = thing
      .toString()
      .replace('\\/?', '')
      .replace('(?=\\/|$)', '$')
      .match(/^\/\^((?:\\[.*+?^${}()|[\]\\\/]|[^.*+?^${}()|[\]\\\/])*)\$\//);

    return match ? match[1].replace(/\\(.)/g, '$1').split('/') : '<complex:' + thing.toString() + '>';
  }
};

export const print = (path: any[], layer: any) => {
  if (layer.route) {
    layer.route.stack.forEach((l: any) => print(path.concat(split(layer.route.path)), l));
    return;
  }
  if (layer.name === 'router' && layer.handle.stack) {
    layer.handle.stack.forEach((l: any) => print(path.concat(split(layer.regexp)), l));
    return;
  }
  if (layer.method) {
    console.log(layer.method.toUpperCase(), path.concat(split(layer.regexp)).filter(Boolean).join('/'));
  }
};

export const inspectRoutes = (app: Application): void => {
  divider();
  app._router.stack.forEach((l: any) => print([], l));
  divider();
};
