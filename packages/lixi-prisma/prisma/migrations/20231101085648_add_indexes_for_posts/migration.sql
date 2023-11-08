-- CreateIndex
CREATE INDEX "page_page_account_id_idx" ON "page"("page_account_id");

-- CreateIndex
CREATE INDEX "post_post_account_id_idx" ON "post"("post_account_id");

-- CreateIndex
CREATE INDEX "post_page_id_idx" ON "post"("page_id");
