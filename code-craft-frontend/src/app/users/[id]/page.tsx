'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FollowButton } from '@/components/user/FollowButton';
import { FollowersModal } from '@/components/user/FollowersModal';
import { SnippetCard } from '@/components/snippet/SnippetCard';
import { userProfileApi, apiClient } from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/constants';
import { useAuthStore } from '@/stores/authStore';
import {
  Calendar,
  Code2,
  FileCode,
  User,
  UserPlus,
  Users,
} from 'lucide-react';

export default function UserProfilePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followersModalTab, setFollowersModalTab] = useState<'followers' | 'following'>('followers');

  // Redirect to own profile if viewing self
  if (currentUser && currentUser._id === params.id) {
    router.replace('/profile');
    return null;
  }

  // Fetch user profile
  const { data: userProfile, isLoading: isLoadingProfile, error: profileError } = useQuery({
    queryKey: ['user-profile', params.id],
    queryFn: () => userProfileApi.getUserProfile(params.id),
  });

  // Fetch user's snippets
  const { data: snippetsData, isLoading: isLoadingSnippets } = useQuery({
    queryKey: ['user-snippets', params.id],
    queryFn: async () => {
      const response = await apiClient.get(`${API_ENDPOINTS.SNIPPETS.BASE}?userId=${params.id}`);
      return response.data;
    },
    enabled: !!userProfile,
  });

  const handleOpenFollowersModal = (tab: 'followers' | 'following') => {
    setFollowersModalTab(tab);
    setFollowersModalOpen(true);
  };

  // Generate initials from user name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoadingProfile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Profile Header Skeleton */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-6">
                <Skeleton className="h-24 w-24 rounded-full" />
                <div className="flex-1 space-y-4">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-4 w-full max-w-lg" />
                  <div className="flex gap-4">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Handle error state
  if (profileError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Error loading profile</h1>
          <p className="text-muted-foreground mb-6">
            {profileError instanceof Error ? profileError.message : 'Failed to load user profile. Please try again later.'}
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
            <Button variant="outline" onClick={() => router.push('/discover')}>
              Discover Users
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">User not found</h1>
          <p className="text-muted-foreground mb-6">
            The user you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => router.push('/discover')}>
            Discover Users
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              {/* Avatar */}
              <Avatar className="h-24 w-24">
                <AvatarImage src={userProfile.avatar} alt={userProfile.name} />
                <AvatarFallback>
                  {userProfile.name ? getInitials(userProfile.name) : <User className="h-12 w-12" />}
                </AvatarFallback>
              </Avatar>

              {/* User Info */}
              <div className="flex-1 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold">{userProfile.name}</h1>
                    {userProfile.bio && (
                      <p className="text-muted-foreground mt-1">{userProfile.bio}</p>
                    )}
                  </div>
                  {currentUser && (
                    <FollowButton
                      userId={userProfile._id}
                      initialFollowState={userProfile.isFollowing}
                    />
                  )}
                </div>

                {/* Stats */}
                <div className="flex flex-wrap gap-4 text-sm">
                  <button
                    onClick={() => handleOpenFollowersModal('followers')}
                    className="flex items-center gap-2 hover:text-primary transition-colors"
                  >
                    <Users className="h-4 w-4" />
                    <span className="font-semibold">{userProfile.followerCount}</span>
                    <span className="text-muted-foreground">followers</span>
                  </button>
                  
                  <button
                    onClick={() => handleOpenFollowersModal('following')}
                    className="flex items-center gap-2 hover:text-primary transition-colors"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span className="font-semibold">{userProfile.followingCount}</span>
                    <span className="text-muted-foreground">following</span>
                  </button>

                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {format(new Date(userProfile.createdAt), 'MMMM yyyy')}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="snippets" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="snippets">
              <FileCode className="h-4 w-4 mr-2" />
              Snippets
            </TabsTrigger>
            <TabsTrigger value="activity">
              <Code2 className="h-4 w-4 mr-2" />
              Activity
            </TabsTrigger>
          </TabsList>

          {/* Snippets Tab */}
          <TabsContent value="snippets" className="mt-6">
            {isLoadingSnippets ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[...Array(4)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-full mb-4" />
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : snippetsData?.data?.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileCode className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {userProfile.name} hasn't created any snippets yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {snippetsData?.data?.map((snippet: any) => (
                  <SnippetCard key={snippet._id} snippet={snippet} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="mt-6">
            <Card>
              <CardContent className="p-12 text-center">
                <Code2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Activity feed coming soon...
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Followers Modal */}
        <FollowersModal
          isOpen={followersModalOpen}
          onClose={() => setFollowersModalOpen(false)}
          userId={userProfile._id}
          userName={userProfile.name}
          initialTab={followersModalTab}
        />
      </div>
    </div>
  );
}
