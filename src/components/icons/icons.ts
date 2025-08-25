'use client';
import { Package, GitBranch, Briefcase } from 'lucide-react';
import { Logo } from '@/components/icons/logo';
import type { IconType } from '@/hooks/use-settings';

export const icons: { [key in IconType]: React.ElementType } = {
  default: Logo,
  package: Package,
  'git-branch': GitBranch,
  briefcase: Briefcase,
};

export const getIcon = (iconName: IconType) => {
  return icons[iconName] || Logo;
};
