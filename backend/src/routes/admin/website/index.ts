import { Router } from "express";
import {
  listWebsites,
  getWebsite,
  createWebsite,
  updateWebsite,
  deleteWebsite,
  listWebsiteTemplates,
} from "./websites.js";
import {
  listPages,
  getPage,
  createPage,
  updatePage,
  duplicatePage,
  deletePage,
} from "./pages.js";
import {
  listDomains,
  addDomain,
  verifyDomain,
  setPrimaryDomain,
  deleteDomain,
} from "./domains.js";
import {
  publishWebsite,
  listDeployments,
  rollbackDeployment,
} from "./deployments.js";
import {
  listMenus,
  upsertMenu,
  deleteMenu,
} from "./menus.js";
import {
  listAssets,
  createAsset,
  deleteAsset,
  uploadWebsiteAsset,
  websiteUploader,
} from "./assets.js";
import {
  listForms,
  createForm,
  deleteForm,
} from "./forms.js";

const router = Router();

// Templates catalog
router.get("/templates", listWebsiteTemplates);

// General Upload Route
router.post("/upload", websiteUploader.single("file"), uploadWebsiteAsset);

// Websites CRUD
router.get("/", listWebsites);
router.post("/", createWebsite);
router.get("/:websiteId", getWebsite);
router.put("/:websiteId", updateWebsite);
router.delete("/:websiteId", deleteWebsite);

// Pages
router.get("/:websiteId/pages", listPages);
router.post("/:websiteId/pages", createPage);
router.get("/:websiteId/pages/:pageId", getPage);
router.put("/:websiteId/pages/:pageId", updatePage);
router.post("/:websiteId/pages/:pageId/duplicate", duplicatePage);
router.delete("/:websiteId/pages/:pageId", deletePage);

// Domains
router.get("/:websiteId/domains", listDomains);
router.post("/:websiteId/domains", addDomain);
router.post("/:websiteId/domains/:domainId/verify", verifyDomain);
router.post("/:websiteId/domains/:domainId/primary", setPrimaryDomain);
router.delete("/:websiteId/domains/:domainId", deleteDomain);

// Deployments & Publishing
router.post("/:websiteId/publish", publishWebsite);
router.get("/:websiteId/deployments", listDeployments);
router.post("/:websiteId/deployments/:deploymentId/rollback", rollbackDeployment);

// Navigation Menus
router.get("/:websiteId/menus", listMenus);
router.post("/:websiteId/menus", upsertMenu);
router.delete("/:websiteId/menus/:menuId", deleteMenu);

// Assets
router.get("/:websiteId/assets", listAssets);
router.post("/:websiteId/assets", createAsset);
router.post("/:websiteId/assets/upload", websiteUploader.single("file"), uploadWebsiteAsset);
router.delete("/:websiteId/assets/:assetId", deleteAsset);

// Forms
router.get("/:websiteId/forms", listForms);
router.post("/:websiteId/forms", createForm);
router.delete("/:websiteId/forms/:formId", deleteForm);

export default router;
