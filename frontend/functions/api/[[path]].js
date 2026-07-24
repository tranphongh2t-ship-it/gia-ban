const WORKER_URL = 'https://gia-ban-backend.maketing.workers.dev'

export async function onRequest(context) {
  const { request } = context
  const url = new URL(request.url)
  const target = WORKER_URL + url.pathname + url.search

  const init = {
    method: request.method,
    headers: request.headers,
  }
  if (!['GET', 'HEAD'].includes(request.method)) {
    init.body = request.body
  }

  return fetch(target, init)
}
