'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { FollowButton } from './FollowButton';
import { User } from 'lucide-react';
import { UserProfile, UserSearchResult } from '@/types/api';

interface UserCardProps {
  user: UserProfile | UserSearchResult;
  showFollowButton?: boolean;
  className?: string;
}

export function UserCard({ user, showFollowButton = true, className }: UserCardProps) {
  // Generate initials from user name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${className}`} role="listitem">
      <CardContent className="p-4">
        <Link href={`/users/${user._id}`} className="block">
          <div className="flex items-start space-x-4">
            {/* Avatar */}
            <Avatar className="h-12 w-12 flex-shrink-0">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback>
                {user.name ? getInitials(user.name) : <User className="h-6 w-6" />}
              </AvatarFallback>
            </Avatar>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Name */}
                  <h3 className="text-sm font-semibold text-foreground truncate">
                    {user.name || 'Unknown User'}
                  </h3>
                  
                  {/* Bio */}
                  {user.bio && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {user.bio}
                    </p>
                  )}
                  
                  {/* Stats */}
                  <div className="flex items-center gap-3 mt-2">
                    {user.followerCount !== undefined && (
                  <Badge variant="secondary" className="text-xs" aria-label="Follower count">
                        {user.followerCount} {user.followerCount === 1 ? 'follower' : 'followers'}
                      </Badge>
                    )}
                    
                    {user.followingCount !== undefined && (
                  <Badge variant="outline" className="text-xs" aria-label="Following count">
                        {user.followingCount} following
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Follow Button */}
                {showFollowButton && user._id && (
                <div 
                  className="ml-4" 
                  onClick={(e) => e.preventDefault()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                  aria-label="Follow button container"
                >
                    <FollowButton
                      userId={user._id}
                      initialFollowState={user.isFollowing}
                      size="sm"
                      variant="outline"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
