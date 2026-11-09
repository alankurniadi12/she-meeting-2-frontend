import { createRouter, createWebHistory } from 'vue-router';
import DashboardView from './components/DashboardView.vue';
import FindingsView from './pages/FindingsView.vue';
import LoginView from './pages/LoginView.vue';
import NotFoundView from './pages/NotFoundView.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: (to) => ({ name: 'dashboard', query: to.query }) },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/dashboard', name: 'dashboard', component: DashboardView, meta: { requiresAuth: true } },
    { path: '/findings', name: 'findings', component: FindingsView, meta: { requiresAuth: true } },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView },
  ],
  scrollBehavior(to, from, saved) { return saved || (to.path !== from.path ? { top: 0 } : false); },
});
