import React, { Component } from 'react';
import { observer, inject } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import { Table, Progress, Tooltip } from 'choerodon-ui';
import { Content, Header, Page, Permission, Action, stores } from 'choerodon-front-boot';
import ValueConfig from '../valueConfig';
import '../AppDeploy.scss';
import '../../../main.scss';
import DelIst from '../component/delIst/DelIst';

const { AppState } = stores;

@observer
class AppInstance extends Component {
  constructor(props, context) {
    super(props, context);
    this.state = {
      id: null,
      idArr: [],
      visible: false,
      openRemove: false,
      loading: false,
      page: 0,
      name: '',
    };
  }

  /**
   * 处理页面跳转
   * @param url 跳转地址
   */
  linkToChange = (url) => {
    const { history } = this.props;
    history.push(url);
  };

  /**
   * 查看部署详情
   * @param id 实例ID
   * @param status 实例状态
   */
  linkDeployDetail = (id, status) => {
    const projectId = parseInt(AppState.currentMenuType.id);
    const projectName = AppState.currentMenuType.name;
    const type = AppState.currentMenuType.type;
    const organizationId = AppState.currentMenuType.organizationId;
    this.linkToChange(`/devops/instance/${id}/${status}/detail?type=${type}&id=${projectId}&name=${projectName}&organizationId=${organizationId}`);
  };

  /**
   * 查看版本特性
   * @param id 实例ID
   * @param istName 实例名
   */
  linkVersionFeature = (id, istName) => {
    const { store } = this.props;
    store.setAlertType('versionFeature');
    this.setState({
      id,
      instanceName: istName,
    });
    store.changeShow(true);
  };

  /**
   * 修改配置实例信息
   * @param name 实例名
   * @param id 实例ID
   * @param envId
   * @param verId
   * @param appId
   */
  updateConfig = (name, id, envId, verId, appId) => {
    const { store } = this.props;
    const projectId = parseInt(AppState.currentMenuType.id);
    this.setState({
      idArr: [envId, verId, appId],
      name,
    });
    store.setAlertType('valueConfig');
    store.loadValue(projectId, appId, envId, verId)
      .then((res) => {
        if (res && res.failed) {
          Choerodon.prompt(res.message);
        } else {
          this.setState({
            visible: true,
            id,
          });
        }
      });
  };

  /**
   * 启停用实例
   * @param id 实例ID
   * @param status 状态
   */
  activeIst = (id, status) => {
    const { store } = this.props;
    const projectId = parseInt(AppState.currentMenuType.id);
    store.changeIstActive(projectId, id, status)
      .then((error) => {
        if (error && error.failed) {
          Choerodon.prompt(error.message);
        } else {
          store.loadInstanceAll(projectId, this.state.page);
        }
      });
  };

  /**
   * table 改变的函数
   * @param pagination 分页
   * @param filters 过滤
   * @param sorter 排序
   * @param param 搜索
   */
  tableChange =(pagination, filters, sorter, param) => {
    const { store } = this.props;
    const projectId = parseInt(AppState.currentMenuType.id);
    const sort = {};
    if (sorter.column) {
      const { field, order } = sorter;
      sort[field] = order;
    }
    let searchParam = {};
    if (Object.keys(filters).length) {
      searchParam = filters;
    }
    const postData = {
      searchParam,
      param: param.toString(),
    };
    this.setState({ page: pagination.current - 1, pageSize: pagination.pageSize });
    store.loadInstanceAll(projectId, pagination.current - 1, pagination.pageSize, sort,
      null, null, null, postData);
  };

  /**
   * 关闭滑块
   * @param res 是否重新部署需要重载数据
   */
  handleCancel =(res) => {
    const { store } = this.props;
    const projectId = parseInt(AppState.currentMenuType.id);
    this.setState({
      visible: false,
    });
    if (res) {
      store.loadInstanceAll(projectId, this.state.page);
    }
    store.changeShow(false);
  };

  /**
   * 打开删除数据模态框
   * @param id
   */
  handleOpen(id) {
    this.setState({ openRemove: true, id });
  }

  /**
   * 删除数据
   */
  handleDelete = (id) => {
    const { store } = this.props;
    const projectId = parseInt(AppState.currentMenuType.id);
    this.setState({
      loading: true,
    });
    store.deleteIst(projectId, id)
      .then((res) => {
        if (res && res.failed) {
          Choerodon.prompt(res.message);
        } else {
          this.setState({
            openRemove: false,
            loading: false,
          });
          store.loadInstanceAll(projectId, this.state.page);
        }
      });
  };

  /**
   * 关闭删除数据的模态框
   */
  handleClose = () => {
    this.setState({ openRemove: false });
  };

  /**
   * action 权限控制
   * @param record 行数据
   * @returns {*}
   */
  columnAction = (record) => {
    const projectId = parseInt(AppState.currentMenuType.id);
    const organizationId = AppState.currentMenuType.organizationId;
    const type = AppState.currentMenuType.type;
    if (record.status === 'operating' || !record.connect) {
      return (<Action
        data={[
          {
            type,
            organizationId,
            projectId,
            service: ['devops-service.devops-pod.getLogs', 'devops-service.application-instance.listResources'],
            text: '查看实例详情',
            action: this.linkDeployDetail.bind(this, record.id, record.status),
          }]}
      />);
    } else if (record.status === 'failed') {
      return (<Action
        data={[
          {
            type,
            organizationId,
            projectId,
            service: ['devops-service.devops-pod.getLogs', 'devops-service.application-instance.listResources'],
            text: '查看实例详情',
            action: this.linkDeployDetail.bind(this, record.id, record.status),
          }, {
            type,
            organizationId,
            projectId,
            service: ['devops-service.application-instance.queryValues'],
            text: Choerodon.getMessage('修改配置信息', 'Modify configuration information'),
            action: this.updateConfig.bind(this, record.code, record.id,
              record.envId, record.appVersionId, record.appId),
          }, {
            type,
            organizationId,
            projectId,
            service: ['devops-service.application-instance.delete'],
            text: Choerodon.getMessage('删除实例', 'Delete the instance'),
            action: this.handleOpen.bind(this, record.id),
          },
        ]}
      />);
    } else {
      return (<Action
        data={[
          {
            type,
            organizationId,
            projectId,
            service: ['devops-service.devops-pod.getLogs', 'devops-service.application-instance.listResources'],
            text: '查看实例详情',
            action: this.linkDeployDetail.bind(this, record.id, record.status),
          }, {
            type,
            organizationId,
            projectId,
            service: ['devops-service.application-instance.queryValues'],
            text: Choerodon.getMessage('修改配置信息', 'Modify configuration information'),
            action: this.updateConfig.bind(this, record.code, record.id,
              record.envId, record.appVersionId, record.appId),
          }, {
            type,
            organizationId,
            projectId,
            service: ['devops-service.application-instance.start', 'devops-service.application-instance.stop'],
            text: record.status !== 'stoped' ? Choerodon.getMessage('停止实例', 'Stop the instance') : Choerodon.getMessage('重启实例', 'Start the instance'),
            action: record.status !== 'stoped' ? this.activeIst.bind(this, record.id, 'stop') : this.activeIst.bind(this, record.id, 'start'),
          }, {
            type,
            organizationId,
            projectId,
            service: ['devops-service.application-instance.delete'],
            text: Choerodon.getMessage('删除实例', 'Delete the instance'),
            action: this.handleOpen.bind(this, record.id),
          },
        ]}
      />);
    }
  };

  render() {
    const { store } = this.props;
    const ist = store.getIstAll;
    const projectId = parseInt(AppState.currentMenuType.id);
    const pageInfo = store.getPageInfo;


    const columns = [{
      title: Choerodon.languageChange('deploy.status'),
      key: 'podCount',
      filters: [],
      render: record => (
        <div className="c7n-deploy-status">
          <svg className={record.podCount === 0 ? 'c7n-deploy-circle-process-ban' : 'c7n-deploy-circle_red'}>
            <circle className="c7n-transition-rotate" cx="50%" cy="50%" r="40%" strokeWidth="16.5%" />
          </svg>
          <svg className={record.podCount === 0 ? 'c7n-deploy-circle-process-ban' : 'c7n-deploy-circle-process'}>
            <circle className="c7n-transition-rotate" cx="50%" cy="50%" r="40%" strokeWidth="16.5%" strokeDashoffset={`${251 * ((record.podCount - record.podRunningCount) / record.podCount)}%`} />
          </svg>
          <span className="c7n-deploy-status-num">{record.podCount}</span>
        </div>
      ),
    }, {
      title: Choerodon.languageChange('deploy.istStatus'),
      key: 'status',
      render: record => (
        <div>
          <div className={`c7n-ist-status c7n-ist-status_${record.status}`}>
            <div>{Choerodon.languageChange(record.status || 'null')}</div>
          </div>
        </div>
      ),
    }, {
      title: Choerodon.languageChange('deploy.instance'),
      key: 'code',
      filters: [],
      render: record => (record.commandStatus === 'success' ? <span className="c7n-deploy-istCode">{record.code}</span> : <div>
        {record.commandStatus === 'doing' ? (<div>
          <span className="c7n-deploy-istCode">{record.code}</span>
          <Tooltip title={Choerodon.languageChange(`ist_${record.commandType}`)}>
            <Progress type="loading" width={15} />
          </Tooltip>
        </div>) :
          (<div>
            <span className="c7n-deploy-istCode">{record.code}</span>
            <Tooltip title={`${record.commandType} ${record.commandStatus}: ${record.error}`}>
              <span className="icon icon-error c7n-deploy-ist-operate" />
            </Tooltip>
          </div>)}
      </div>),
    }, {
      title: Choerodon.languageChange('deploy.app'),
      key: 'appName',
      filters: [],
      render: record => (
        <div>
          <div className="c7n-deploy-col-inside">
            {record.projectId === projectId ? <Tooltip title="本项目"><span className="icon icon-project c7n-icon-publish" /></Tooltip> : <Tooltip title="应用市场"><span className="icon icon-apps c7n-icon-publish" /></Tooltip>}
            <span>{record.appName}</span>
          </div>
          <div>
            <span className="c7n-deploy-text_gray">{record.appVersion}</span>
          </div>
        </div>
      ),
    }, {
      title: Choerodon.languageChange('deploy.env'),
      key: 'envCode',
      filters: [],
      render: record => (
        <div>
          <div className="c7n-deploy-col-inside">
            {record.connect ? <Tooltip title="已连接"><span className="c7n-ist-status_on" /></Tooltip> : <Tooltip title="未连接"><span className="c7n-ist-status_off" /></Tooltip>}
            <span>{record.envName}</span>
          </div>
          <div>
            <span className="c7n-deploy-text_gray">{record.envCode}</span>
          </div>
        </div>
      ),
    }, {
      width: 64,
      className: 'c7n-operate-icon',
      key: 'action',
      render: record => this.columnAction(record),
    }];

    return (
      <div className="c7n-region">
        <Table
          filterBarPlaceholder="过滤表"
          onChange={this.tableChange}
          loading={store.getIsLoading}
          columns={columns}
          pagination={pageInfo}
          dataSource={ist}
          rowKey={record => record.id}
        />
        {this.state.visible && <ValueConfig
          store={this.props.store}
          visible={this.state.visible}
          name={this.state.name}
          id={this.state.id}
          idArr={this.state.idArr}
          onClose={this.handleCancel}
        /> }
        <DelIst
          open={this.state.openRemove}
          handleCancel={this.handleClose}
          handleConfirm={this.handleDelete.bind(this, this.state.id)}
          confirmLoading={this.state.loading}
        />
      </div>
    );
  }
}

export default (withRouter(AppInstance));
