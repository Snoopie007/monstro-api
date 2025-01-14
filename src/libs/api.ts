import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json"
  },
});

const nextApi = axios.create({
  headers: {
    "Content-Type": "application/json"
  },

});



async function fetcher(data: { url: string, id: string }) {
  const res = await fetch(`/api/protected/${data.id}/${data.url}`);
  if (!res.ok) {
    throw new Error("An error occurred while fetching the data.");
  }

  return await res.json();
}


async function postFile(props: { url: string, data: any, id: string }) {
  let headers = {};
  headers = {
    "Content-Type": "multipart/form-data"
  }
  return nextApi.post(`/api/protected/${props.id}/${props.url}`, props.data, { headers }).then((res) => {
    return res.data.data;
  });
}


async function postRegister(props: { url: string, data: any }) {
  return api.post(props.url, props.data).then((res) => {
    return res.data.data;
  });
}

async function getRegister(props: { url: string }) {
  return api.get(props.url).then((res) => {
    return res.data.data;
  });
}


async function post(props: { url: string, data: any, id: string }) {
  return nextApi.post(`/api/protected/${props.id}/${props.url}`, props.data).then((res) => {
    return res.data.data;
  });
}

async function put(props: { url: string, data: any, id: string }) {
  return nextApi.put(`/api/protected/${props.id}/${props.url}`, props.data).then((res) => {
    return res.data.data;
  });
}

async function del(props: { url: string, id: string }) {
  return nextApi.delete(`/api/protected/${props.id}/${props.url}`).then((res) => {
    return res.data.data;
  });
}

// async function syncMember(locationId: string, programId: number) {
//   const res = await api.post(`/vendor/sync-members`, { locationId, programId });
//   return;
// }

async function getProgramsByVendorId(vendorId: number) {
  const res = await nextApi.get(`/api/auth/register/programs/${vendorId}`);
  const data = res.data;
  return data;
}

async function getPlansByProgramId(programId: number) {
  const res = await nextApi.get(`/api/auth/register/plans/${programId}`);
  const data = res.data;
  return data;
}

async function getContractVariables(contractId: string) {
  const res = await nextApi.get(`/api/auth/register/sign-contract/variables/${contractId}`);
  const data = res.data;
  return data;
}

async function fillContract(body: any) {
  const res = await nextApi.post(`/api/auth/register/sign-contract`, body);
  const data = res.data;
  return data;
}

async function getVendorStripePublishableKey(programId: string) {
  const res = await nextApi.get(`/api/auth/register/checkout/stripe-publishable-key/${programId}`);
  const data = res.data;
  return data;
}

async function registerMember(body: any) {
  const res = await nextApi.post(`/api/auth/register/register`, body);
  const data = res.data;
  return data;
}

async function registerVendor(body: any) {
  const res = await nextApi.post(`/api/auth/register/vendor`, body);
  const data = res.data;
  return data;
}

async function getContractByPlan(planId: string) {
  const res = await nextApi.get(`/api/auth/register/sign-contract/${planId}`);
  const data = res.data;
  return data;
}

async function addProgram(body: any, id: string) {
  const res = await post({ url: 'programs', data: body, id: id });
  return res;
}

async function addPlan(body: any, pId: number, id: string) {
  const res = await post({ url: `programs/${pId}/plans/`, data: body, id: id });
  return res;
}


async function updateProgramLevel(lId: number, body: any, pId: number, id: string) {
  const res = await put({ url: `programs/${pId}/levels/${lId}`, data: body, id: id });
  return res;
}

async function addProgramLevel(body: any, pId: number, id: string) {
  const res = await post({ url: `programs/${pId}/levels/`, data: body, id });
  return res;
}

async function updateAchievment(aid: number, body: any, id: string) {
  const res = await put({ url: `achievements/${aid}`, data: body, id: id });
  return res;
}

async function addAchievment(body: any, id: string) {
  const res = await post({ url: `achievements/`, data: body, id: id });
  return res;
}

async function deleteAchievement(aId: number, id: string) {
  const res = await del({ url: `achievements/${aId}`, id: id });
  return res;
}

async function updateReward(rid: number, body: any, id: string) {
  const res = await put({ url: `rewards/${rid}`, data: body, id: id });
  return res;
}

async function addReward(body: any, id: string) {
  const res = await post({ url: `rewards`, data: body, id: id });
  return res;
}

async function addMemberManually(body: any, id: string) {
  const res = await post({url: `members`, data: body, id: id});
  return res;
}

async function deleteReward(rId: number, id: string) {
  const res = await del({ url: `rewards/${rId}`, id: id });
  return res;
}

async function inviteMember(body: any, id: string) {
  const res = await post({ url: `invite-member`, data: body, id: id });
  return res;
}

async function createContract(body: any, id: string) {
  const res = await post({ url: `contracts`, data: body, id: id });
  return res;
}

async function updateContract(contractId: number, body: any, id: string) {
  const res = await post({ url: `contracts/${contractId}`, data: body, id: id });
  return res;
}

async function addRole(body: any, id: string) {
  const res = await post({ url: `roles`, data: body, id: id });
  return res;
}

async function updateRole(rid: number, body: any, id: string) {
  const res = await put({ url: `roles/${rid}`, data: body, id: id });
  return res;
}

async function deleteRole(rid: number, id: string) {
  const res = await del({ url: `roles/${rid}`, id: id });
  return res;
}

async function addStaff(body: any, id: string) {
  const res = await post({ url: `staffs`, data: body, id: id });
  return res;
}

async function updateStaff(rid: number, body: any, id: string) {
  const res = await put({ url: `staffs/${rid}`, data: body, id: id });
  return res;
}

async function deleteStaff(rid: number, id: string) {
  const res = await del({ url: `staffs/${rid}`, id: id });
  return res;
}

async function updatePassword(body: any, id: string) {
  const res = await put({ url: `profile/update-password`, data: body, id: id });
  return res;
}

async function updateProfile(body: any, id: string) {
  const res = await put({ url: `profile`, data: body, id: id });
  return res;
}


export {
  api,
  nextApi,
  post,
  put,
  postFile,
  del,
  postRegister,
  getRegister,
  addProgram,
  getProgramsByVendorId,
  getPlansByProgramId,
  inviteMember,
  addPlan,
  registerMember,
  getContractByPlan,
  getContractVariables,
  fillContract,
  getVendorStripePublishableKey,
  createContract,
  updateContract,
  registerVendor,
  updateProgramLevel,
  addProgramLevel,
  updateAchievment,
  addAchievment,
  deleteAchievement,
  updateReward,
  addReward,
  deleteReward,
  addMemberManually,
  addRole,
  updateRole,
  deleteRole,
  addStaff,
  updateStaff,
  deleteStaff,
  updatePassword,
  updateProfile,
  fetcher
};
