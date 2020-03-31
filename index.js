const fetch = require('node-fetch');

const PREFIX = Symbol('prefix');

const ensureSuffix = (string, suffix) =>
  string.endsWith(suffix) ? string : string + suffix;

const proxyHandler = {
  get: (target, property) => createProxy([...target[PREFIX], property]),

  apply: async (target, _this, arguments) =>
    await callRemoteFunction(
      target[PREFIX][0],
      target[PREFIX].slice(1),
      arguments
    ),
};

const createProxy = (prefix = []) => {
  const f = () => {};
  f[PREFIX] = prefix;
  return new Proxy(f, proxyHandler);
};

const callRemoteFunction = async (apiEndpoint, functionPath, arguments) => {
  const endpoint = apiEndpoint + functionPath.join('/');
  const response = await fetch(endpoint, {
    method: 'post',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(arguments),
  });

  if (response.status === 404) {
    throw new ReferenceError(`${functionPath.join('.')} is not defined`);
  }

  const text = await response.text();

  if (response.status === 500) {
    throw JSON.parse(text);
  }

  if (text.length > 0) {
    return JSON.parse(text);
  }
};

module.exports = ({ endpoint = '/' } = { endpoint: '/' }) =>
  createProxy([ensureSuffix(endpoint, '/')]);
