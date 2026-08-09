*** Begin Patch
*** Update File: src/components/feed/PostModal.tsx
@@
-import { X, Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Trash2, Flag } from 'lucide-react';
+import { X, Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Trash2, Flag } from 'lucide-react';
+import ShareButton from '@/components/shared/ShareButton';
@@
-            <div className="flex items-center gap-1">
-                <button
-                  onClick={toggleLike}
-                  className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all ${liked ? 'text-error-500' : ''}`}
-                >
-                  <Heart className={`w-6 h-6 ${liked ? 'fill-current' : ''}`} />
-                </button>
-                <button
-                  onClick={() => {
-                    setShowComments(!showComments);
-                    if (!showComments) loadComments();
-                  }}
-                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all"
-                >
-                  <MessageCircle className="w-6 h-6" />
-                </button>
-                <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all">
-                  <Send className="w-6 h-6" />
-                </button>
-
-                {/* Share button in modal */}
-                <div className="p-2" onClick={(e) => e.stopPropagation()}>
-                  <ShareButton
-                    url={typeof window !== 'undefined' ? `${window.location.origin}/p/${post.id}` : undefined}
-                    title={`${post.profile?.username || 'GraficNeo'}'s post`}
-                    text={post.caption || 'Check out this post on GraficNeo'}
-                    className=""
-                  />
-                </div>
-              </div>
+            <div className="flex items-center gap-1">
+                <button
+                  onClick={toggleLike}
+                  className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all ${liked ? 'text-error-500' : ''}`}
+                >
+                  <Heart className={`w-6 h-6 ${liked ? 'fill-current' : ''}`} />
+                </button>
+                <button
+                  onClick={() => {
+                    setShowComments(!showComments);
+                    if (!showComments) loadComments();
+                  }}
+                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all"
+                >
+                  <MessageCircle className="w-6 h-6" />
+                </button>
+                <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all">
+                  <Send className="w-6 h-6" />
+                </button>
+
+                {/* Share button in modal */}
+                <div className="p-2" onClick={(e) => e.stopPropagation()}>
+                  <ShareButton
+                    url={typeof window !== 'undefined' ? `${window.location.origin}/p/${post.id}` : undefined}
+                    title={`${post.profile?.username || 'GraficNeo'}'s post`}
+                    text={post.caption || 'Check out this post on GraficNeo'}
+                    className=""
+                  />
+                </div>
+              </div>
*** End Patch
