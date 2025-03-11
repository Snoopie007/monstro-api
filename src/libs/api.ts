
// const api = axios.create({
// 	baseURL: process.env.NEXT_PUBLIC_API_URL,
// 	headers: {
// 		"Content-Type": "application/json"
// 	},
// });

// const nextApi = axios.create({
// 	headers: {
// 		"Content-Type": "application/json"
// 	},

// });






// async function postRegister(props: { url: string, data: any }) {
// 	return api.post(props.url, props.data).then((res) => {
// 		return res.data.data;
// 	});
// }

// async function getRegister(props: { url: string }) {
// 	return api.get(props.url).then((res) => {
// 		return res.data.data;
// 	});
// }


// async function post(props: { url: string, data: any, id: string }) {
// 	return nextApi.post(`/api/protected/${props.id}/${props.url}`, props.data).then((res) => {
// 		return res.data.data;
// 	});
// }

// async function put(props: { url: string, data: any, id: string }) {
// 	return nextApi.put(`/api/protected/${props.id}/${props.url}`, props.data).then((res) => {
// 		return res.data.data;
// 	});
// }

// async function del(props: { url: string, id: string }) {
// 	return nextApi.delete(`/api/protected/${props.id}/${props.url}`).then((res) => {
// 		return res.data.data;
// 	});
// }



// async function fillContract(body: any) {
// 	const res = await nextApi.post(`/api/auth/register/sign-contract`, body);
// 	const data = res.data;
// 	return data;
// }


// async function getContractByPlan(planId: string) {
// 	const res = await nextApi.get(`/api/auth/register/sign-contract/${planId}`);
// 	const data = res.data;
// 	return data;
// }
