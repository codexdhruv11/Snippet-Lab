"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Edit2, Save, User, Code, Terminal, Star, Users, UserPlus } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ContributionGraph } from "@/components/profile/ContributionGraph";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/stores/authStore";
import { apiClient, followApi } from "@/lib/api";
import { API_ENDPOINTS, API_LIMITS } from "@/lib/constants";
import { SnippetCard } from "@/components/snippet/SnippetCard";
import { FollowersModal } from "@/components/user/FollowersModal";

// Form validation schema
const profileSchema = z.object({
  name: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(API_LIMITS.NAME_MAX_LENGTH, `Name cannot exceed ${API_LIMITS.NAME_MAX_LENGTH} characters`),
  bio: z.string()
    .max(API_LIMITS.BIO_MAX_LENGTH, `Bio cannot exceed ${API_LIMITS.BIO_MAX_LENGTH} characters`)
    .optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { isAuthenticated, user, updateUserData } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [followersModalTab, setFollowersModalTab] = useState<"followers" | "following">("followers");
  
  // Define queries with proper enabling conditions
  const userQuery = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.USERS.ME);
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
  
  const executionStatsQuery = useQuery({
    queryKey: ["executionStats"],
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.EXECUTIONS.STATS);
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
  
const userSnippetsQuery = useQuery({
  queryKey: ["userSnippets", user?._id],
  queryFn: async () => {
    const userId = user?._id;
    const response = await apiClient.get(`${API_ENDPOINTS.SNIPPETS.BASE}?limit=3&userId=${userId}`);
    return response.data;
  },
  enabled: isAuthenticated && !!user?._id,
  staleTime: 1 * 60 * 1000, // 1 minute
});
  
  const starredSnippetsQuery = useQuery({
    queryKey: ["starredSnippetsPreview"],
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.SNIPPETS.STARRED, {
        params: { limit: 3 }
      });
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
  
  // Follower and following counts
  const followerCountQuery = useQuery({
    queryKey: ["followerCount", user?._id],
    queryFn: async () => {
      if (!user?._id) return { count: 0 };
      return await followApi.getFollowerCount(user._id);
    },
    enabled: isAuthenticated && !!user?._id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
  
  const followingCountQuery = useQuery({
    queryKey: ["followingCount", user?._id],
    queryFn: async () => {
      if (!user?._id) return { count: 0 };
      return await followApi.getFollowingCount(user._id);
    },
    enabled: isAuthenticated && !!user?._id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
  
  // Update profile mutation
  const updateProfile = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      return await apiClient.patch(API_ENDPOINTS.USERS.UPDATE, data);
    },
    onSuccess: (response) => {
      updateUserData(response.data);
      setIsEditing(false);
      toast.success("Profile updated successfully");
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
    onError: () => {
      toast.error("Failed to update profile");
    },
  });
  
  // Form setup
  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || "",
      bio: user?.bio || "",
    },
  });
  
  // Watch bio field for character count
  const bioValue = watch("bio");

  // Extract data from queries first
  const userData = userQuery.data;
  const executionStats = executionStatsQuery.data;
  const userSnippets = userSnippetsQuery.data;
  const starredSnippets = starredSnippetsQuery.data;
  const followerCount = followerCountQuery.data?.count || 0;
  const followingCount = followingCountQuery.data?.count || 0;
  
  // Update form when user data is loaded
  useEffect(() => {
    if (userData) {
      reset({
        name: userData.name || '',
        bio: userData.bio || '',
      });
    }
  }, [userData, reset]);
  

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  // Handle form submission
  const onSubmit = (data: ProfileFormValues) => {
    updateProfile.mutate(data);
  };

  // Toggle edit mode
  const toggleEdit = () => {
    if (isEditing) {
      // Cancel editing
      reset({
        name: userData?.name || user?.name || "",
        bio: userData?.bio || user?.bio || "",
      });
    }
    setIsEditing(!isEditing);
  };

  const openFollowersModal = (tab: "followers" | "following") => {
    setFollowersModalTab(tab);
    setIsFollowersModalOpen(true);
  };

  return (
    <div className="container py-8">
      <div className="flex flex-col gap-4 mb-6 tablet:flex-row tablet:items-center tablet:justify-between">
        <h1 className="text-heading-2-mobile tablet:text-heading-2-desktop">My Profile</h1>
        <Button 
          variant="outline" 
          onClick={() => router.push("/discover")}
          className="flex items-center gap-2"
        >
          <Users className="h-4 w-4" />
          Discover Users
        </Button>
      </div>
      
      <div className="grid grid-cols-1 gap-6 tablet:grid-cols-2 desktop:grid-cols-3">
        {/* Profile Card */}
        <Card className="desktop:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Manage your personal information</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleEdit}
              className="flex items-center"
            >
              {isEditing ? (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Cancel
                </>
              ) : (
                <>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">
                    Name
                  </label>
                  <Input
                    id="name"
                    {...register("name")}
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? "name-error" : undefined}
                  />
                  {errors.name && (
                    <p id="name-error" className="text-sm text-destructive">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="bio" className="text-sm font-medium">
                    Bio
                  </label>
                  <Textarea
                    id="bio"
                    {...register("bio")}
                    placeholder="Tell us about yourself"
                    rows={4}
                    aria-invalid={!!errors.bio}
                    aria-describedby={errors.bio ? "bio-error" : undefined}
                  />
                  {errors.bio && (
                    <p id="bio-error" className="text-sm text-destructive">
                      {errors.bio.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {(bioValue || "").length}/{API_LIMITS.BIO_MAX_LENGTH} characters
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={updateProfile.isPending}
                    aria-busy={updateProfile.isPending}
                  >
                    {updateProfile.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{userData?.name || user?.name}</h3>
                    <p className="text-sm text-muted-foreground">{userData?.email || user?.email}</p>
                  </div>
                </div>
                
                <div className="pt-4">
                  <h3 className="text-sm font-medium mb-2">Bio</h3>
                  <p className="text-sm text-muted-foreground">
                    {userData?.bio || user?.bio || "No bio provided yet."}
                  </p>
                </div>
                
                <div className="flex gap-4 pt-4 border-t">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => openFollowersModal("followers")}
                    className="flex items-center gap-2 p-0 h-auto hover:bg-transparent"
                  >
                    <span className="font-semibold">{followerCount}</span>
                    <span className="text-muted-foreground">Followers</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => openFollowersModal("following")}
                    className="flex items-center gap-2 p-0 h-auto hover:bg-transparent"
                  >
                    <span className="font-semibold">{followingCount}</span>
                    <span className="text-muted-foreground">Following</span>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Execution Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Terminal className="mr-2 h-5 w-5" />
              Execution Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {executionStats ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Executions</span>
                  <span className="font-medium">{executionStats.totalExecutions || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Successful</span>
                  <span className="font-medium text-success">{executionStats.successfulExecutions || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Failed</span>
                  <span className="font-medium text-destructive">{executionStats.failedExecutions || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg. Execution Time</span>
                  <span className="font-medium">{executionStats.averageExecutionTime?.toFixed(2) || 0} ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Most Used Language</span>
                  <span className="font-medium">{executionStats.mostUsedLanguage || "None"}</span>
                </div>
              </>
            ) : (
              <p className="text-center text-muted-foreground">No execution data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Contribution Graph */}
        <div className="desktop:col-span-3">
          <ContributionGraph userId={user?._id || ""} />
        </div>

        {/* User's Snippets */}
        <Card className="desktop:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Code className="mr-2 h-5 w-5" />
                My Snippets
              </CardTitle>
              <CardDescription>Your recently created snippets</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push("/snippets")}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {userSnippets?.data?.length ? (
              <div className="responsive-grid">
                {userSnippets.data.map((snippet) => (
                  <SnippetCard key={snippet._id} snippet={snippet} />
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-muted-foreground mb-4">You haven&apos;t created any snippets yet.</p>
                <Button onClick={() => router.push("/editor")}>Create Snippet</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Starred Snippets Preview */}
        <Card className="desktop:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Star className="mr-2 h-5 w-5" />
                Starred Snippets
              </CardTitle>
              <CardDescription>Snippets you&apos;ve starred</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push("/snippets/starred")}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {starredSnippets?.data?.length ? (
              <div className="responsive-grid">
                {starredSnippets.data.map((snippet) => (
                  <SnippetCard key={snippet._id} snippet={snippet} />
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-muted-foreground mb-4">You haven&apos;t starred any snippets yet.</p>
                <Button onClick={() => router.push("/snippets")}>Browse Snippets</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Followers/Following Modal */}
      {user?._id && (
        <FollowersModal
          isOpen={isFollowersModalOpen}
          onClose={() => setIsFollowersModalOpen(false)}
          userId={user._id}
          initialTab={followersModalTab}
        />
      )}
    </div>
  );
}
