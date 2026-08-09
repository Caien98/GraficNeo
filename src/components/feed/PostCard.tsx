*** Begin Patch
*** Update File: src/components/feed/PostCard.tsx
@@
-            {/* Share button - uses existing permalink logic if available */}
-            <div className="p-2">
-              <ShareButton
-                url={typeof window !== 'undefined' ? `${window.location.origin}/p/${post.id}` : undefined}
-                title={`${post.profile?.username || 'GraficNeo'}'s post`}
-                text={post.caption || 'Check out this post on GraficNeo'}
-                className="-m-2"
-              />
-            </div>
+            {/* Share button - uses existing permalink logic if available */}
+            <div className="p-2" onClick={(e) => e.stopPropagation()}>
+              <ShareButton
+                url={typeof window !== 'undefined' ? `${window.location.origin}/p/${post.id}` : undefined}
+                title={`${post.profile?.username || 'GraficNeo'}'s post`}
+                text={post.caption || 'Check out this post on GraficNeo'}
+                className="-m-2"
+              />
+            </div>
*** End Patch
