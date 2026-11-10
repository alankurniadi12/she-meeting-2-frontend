import { createRouter, createWebHistory } from 'vue-router';
import DashboardView from './components/DashboardView.vue';
import FindingsView from './pages/FindingsView.vue';
import LoginView from './pages/LoginView.vue';
import NotFoundView from './pages/NotFoundView.vue';
import FindingFormView from './pages/FindingFormView.vue';
import FindingDetailView from './pages/FindingDetailView.vue';
import AdminAccountsView from './pages/AdminAccountsView.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: (to) => ({ name: 'dashboard', query: to.query }) },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/dashboard', name: 'dashboard', component: DashboardView, meta: { requiresAuth: true } },
    { path: '/findings', name: 'findings', component: FindingsView, meta: { requiresAuth: true } },
    { path: '/findings/new', name: 'finding-new', component: FindingFormView, meta: { requiresAuth: true } },
    { path: '/findings/:id([a-fA-F0-9]{24})/edit', name: 'finding-edit', component: FindingFormView, meta: { requiresAuth: true } },
    { path: '/findings/:id([a-fA-F0-9]{24})', name: 'finding-detail', component: FindingDetailView, meta: { requiresAuth: true } },
    { path: '/admin/accounts', name: 'admin-accounts', component: AdminAccountsView, meta: { requiresAuth: true, requiresAdmin: true } },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView },
  ],
  scrollBehavior(to, from, saved) { return saved || (to.path !== from.path ? { top: 0 } : false); },
});
