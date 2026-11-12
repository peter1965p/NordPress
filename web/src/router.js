import { createRouter, createWebHistory } from 'vue-router'
import { pruefeSitzung, darf } from './api.js'

const routes = [
  {
    path: '/',
    component: () => import('./views/site/SiteLayout.vue'),
    children: [
      { path: '', component: () => import('./views/site/Start.vue'), meta: { vollbreite: true } },
      { path: 'blog', component: () => import('./views/site/Blog.vue') },
      { path: 'kategorie/:kategorie', component: () => import('./views/site/Blog.vue') },
      { path: 'beitrag/:slug', component: () => import('./views/site/Inhalt.vue'), props: { typ: 'posts' }, meta: { vollbreite: true } },
      { path: 'seite/:slug', component: () => import('./views/site/Inhalt.vue'), props: { typ: 'pages' }, meta: { vollbreite: true } },
    ],
  },
  { path: '/admin/login', component: () => import('./views/admin/Login.vue'), meta: { titel: 'Anmelden' } },
  {
    path: '/admin',
    component: () => import('./views/admin/AdminLayout.vue'),
    meta: { anmeldung: true },
    children: [
      { path: '', component: () => import('./views/admin/Dashboard.vue'), meta: { titel: 'Dashboard' } },
      { path: 'beitraege', component: () => import('./views/admin/Liste.vue'), props: { typ: 'post' }, meta: { titel: 'Beiträge' } },
      { path: 'beitraege/:id', component: () => import('./views/admin/Editor.vue'), props: r => ({ typ: 'post', id: r.params.id }), meta: { titel: 'Beitrag' } },
      { path: 'seiten', component: () => import('./views/admin/Liste.vue'), props: { typ: 'page' }, meta: { titel: 'Seiten', rolle: 'editor' } },
      { path: 'seiten/:id', component: () => import('./views/admin/Editor.vue'), props: r => ({ typ: 'page', id: r.params.id }), meta: { titel: 'Seite', rolle: 'editor' } },
      { path: 'medien', component: () => import('./views/admin/Medien.vue'), meta: { titel: 'Mediathek' } },
      { path: 'kategorien', component: () => import('./views/admin/Terme.vue'), props: { taxonomie: 'category' }, meta: { titel: 'Kategorien' } },
      { path: 'schlagwoerter', component: () => import('./views/admin/Terme.vue'), props: { taxonomie: 'tag' }, meta: { titel: 'Schlagwörter' } },
      { path: 'benutzer', component: () => import('./views/admin/Benutzer.vue'), meta: { titel: 'Benutzer', rolle: 'admin' } },
      { path: 'einstellungen', component: () => import('./views/admin/Einstellungen.vue'), meta: { titel: 'Einstellungen', rolle: 'admin' } },
    ],
  },
  { path: '/:pfad(.*)*', component: () => import('./views/site/NichtGefunden.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async ziel => {
  if (!ziel.path.startsWith('/admin')) return true
  const benutzer = await pruefeSitzung()
  if (ziel.matched.some(r => r.meta.anmeldung) && !benutzer) return { path: '/admin/login', query: { weiter: ziel.fullPath } }
  if (ziel.path === '/admin/login' && benutzer) return '/admin'
  if (ziel.meta.rolle && !darf(ziel.meta.rolle)) return '/admin'
  return true
})

router.afterEach(ziel => {
  if (ziel.meta.titel) document.title = `${ziel.meta.titel} · NordPress`
})

export default router
