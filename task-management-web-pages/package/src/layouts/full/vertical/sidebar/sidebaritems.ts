export interface ChildItem {
  id?: number | string;
  name?: string;
  icon?: string;
  children?: ChildItem[];
  item?: unknown;
  url?: string;
  color?: string;
  disabled?: boolean;
  subtitle?: string;
  badge?: boolean;
  badgeType?: string;
  isPro?: boolean;
}

export interface MenuItem {
  heading?: string;
  name?: string;
  icon?: string;
  id?: number;
  to?: string;
  items?: MenuItem[];
  children?: ChildItem[];
  url?: string;
  disabled?: boolean;
  subtitle?: string;
  badgeType?: string;
  badge?: boolean;
  isPro?: boolean;
}

import { uniqueId } from 'lodash';

const adminItems: MenuItem[] = [
  {
    heading: 'Dashboard',
    children: [
      {
        name: 'All Tasks',
        icon: 'solar:widget-2-linear',
        id: uniqueId(),
        url: '/',
        isPro: false,
      },
    ],
  },
  {
    heading: 'Manage Tasks',
    children: [
      {
        name: 'Create Task',
        icon: 'solar:document-add-linear',
        id: uniqueId(),
        url: '/utilities/form',
      },
      {
        name: 'Update Task',
        icon: 'solar:pen-new-square-linear',
        id: uniqueId(),
        url: '/utilities/update-task',
      },
    ],
  },
  {
    heading: 'Account',
    children: [
      {
        id: uniqueId(),
        name: 'User Profile',
        icon: 'solar:user-circle-linear',
        url: '/user-profile',
        isPro: false,
      },
    ],
  },
];

const assigneeItems: MenuItem[] = [
  {
    heading: 'Dashboard',
    children: [
      {
        name: 'My Tasks',
        icon: 'solar:checklist-minimalistic-linear',
        id: uniqueId(),
        url: '/all-tasks',
        isPro: false,
      },
    ],
  },
  {
    heading: 'Manage Tasks',
    children: [
      {
        name: 'Create My Task',
        icon: 'solar:add-square-linear',
        id: uniqueId(),
        url: '/utilities/create-task',
      },
      {
        name: 'Update My Task',
        icon: 'solar:pen-new-round-linear',
        id: uniqueId(),
        url: '/utilities/update-my-task',
      },
    ],
  },
  {
    heading: 'Account',
    children: [
      {
        id: uniqueId(),
        name: 'User Profile',
        icon: 'solar:user-circle-linear',
        url: '/user-profile',
        isPro: false,
      },
    ],
  },
];

export const getSidebarItems = (role: string): MenuItem[] =>
  role === 'admin' ? adminItems : assigneeItems;

const SidebarContent: MenuItem[] = [
  {
    heading: 'Dashboard',
    children: [
      {
        name: 'All Tasks',
        icon: 'solar:widget-2-linear',
        id: uniqueId(),
        url: '/',
        isPro: false,
      },
    ],
  },
  {
    heading: 'Manage Tasks',
    children: [
      {
        name: 'My Tasks',
        icon: 'solar:checklist-minimalistic-linear',
        id: uniqueId(),
        url: '/all-tasks',
        isPro: false,
      },
      {
        name: 'Create Task',
        icon: 'solar:document-add-linear',
        id: uniqueId(),
        url: '/utilities/form',
      },
      {
        name: 'Create My Task',
        icon: 'solar:add-square-linear',
        id: uniqueId(),
        url: '/utilities/create-task',
      },
      {
        name: 'Update Task',
        icon: 'solar:pen-new-square-linear',
        id: uniqueId(),
        url: '/utilities/update-task',
      },
      {
        name: 'Update My Task',
        icon: 'solar:pen-new-round-linear',
        id: uniqueId(),
        url: '/utilities/update-my-task',
      },
    ],
  },
  {
    heading: 'Account',
    children: [
      {
        id: uniqueId(),
        name: 'User Profile',
        icon: 'solar:user-circle-linear',
        url: '/user-profile',
        isPro: false,
      },
    ],
  },
];

export default SidebarContent;
